import mail from '@sendgrid/mail'; // v7.7.0
import * as amqp from 'amqplib'; // v0.10.3
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import CircuitBreaker from 'opossum'; // v6.4.0
import { Logger } from '../../common/utils/logger.util';
import { RABBITMQ_CONFIG } from '../../common/config/rabbitmq.config';

// Global constants
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@taskmanager.com';
const MAX_RETRY_ATTEMPTS = 3;
const RATE_LIMIT_PER_SECOND = 10;

// Interfaces
interface INotification {
  subject: string;
  templateId: string;
  data: Record<string, any>;
  priority: 'high' | 'normal' | 'low';
}

interface IBounceNotification {
  email: string;
  reason: string;
  timestamp: Date;
}

/**
 * Service responsible for sending email notifications using SendGrid
 * with enhanced reliability features and monitoring
 */
export class EmailService {
  private logger: Logger;
  private channel: amqp.Channel;
  private circuitBreaker: CircuitBreaker;
  private templateCache: Map<string, string>;
  private currentRateCount: number;
  private lastRateReset: number;

  constructor(channel: amqp.Channel) {
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key is required');
    }

    this.logger = Logger.getInstance();
    this.channel = channel;
    this.templateCache = new Map();
    this.currentRateCount = 0;
    this.lastRateReset = Date.now();

    // Initialize SendGrid client
    mail.setApiKey(SENDGRID_API_KEY);

    // Configure circuit breaker
    this.circuitBreaker = new CircuitBreaker(this.sendWithSendGrid.bind(this), {
      timeout: 10000, // 10 seconds
      errorThresholdPercentage: 50,
      resetTimeout: 30000, // 30 seconds
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10
    });

    this.setupCircuitBreakerEvents();
  }

  /**
   * Sends an email notification with reliability features
   */
  public async sendEmail(
    to: string,
    notification: INotification,
    correlationId: string
  ): Promise<boolean> {
    try {
      this.logger.setCorrelationId(correlationId);
      
      // Validate email address
      if (!this.isValidEmail(to)) {
        throw new Error(`Invalid email address: ${to}`);
      }

      // Check rate limits
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // Sanitize and prepare email content
      const sanitizedData = this.sanitizeEmailData(notification.data);
      const emailContent = await this.prepareEmailContent(
        notification.templateId,
        sanitizedData
      );

      // Prepare email message
      const msg = {
        to,
        from: FROM_EMAIL,
        subject: notification.subject,
        html: emailContent,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        },
        customArgs: {
          correlationId,
          priority: notification.priority
        }
      };

      // Send email using circuit breaker
      const result = await this.circuitBreaker.fire(msg);
      
      this.logger.info('Email sent successfully', {
        to,
        subject: notification.subject,
        correlationId
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to send email', error as Error, {
        to,
        subject: notification.subject,
        correlationId
      });
      
      // Retry logic for failed deliveries
      return this.handleFailedDelivery(to, notification, correlationId);
    }
  }

  /**
   * Processes email notifications from the queue
   */
  public async processEmailQueue(): Promise<void> {
    try {
      await this.channel.assertQueue(RABBITMQ_CONFIG.queues.notifications, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': RABBITMQ_CONFIG.deadLetterExchange,
          'x-message-ttl': 86400000 // 24 hours
        }
      });

      await this.channel.prefetch(RATE_LIMIT_PER_SECOND);

      this.channel.consume(
        RABBITMQ_CONFIG.queues.notifications,
        async (msg) => {
          if (!msg) return;

          try {
            const { to, notification, correlationId } = JSON.parse(
              msg.content.toString()
            );

            const success = await this.sendEmail(to, notification, correlationId);

            if (success) {
              this.channel.ack(msg);
            } else {
              // Retry logic
              const retryCount = (msg.properties.headers['x-retry-count'] || 0) + 1;
              
              if (retryCount <= MAX_RETRY_ATTEMPTS) {
                const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                
                setTimeout(() => {
                  this.channel.publish(
                    RABBITMQ_CONFIG.exchange,
                    RABBITMQ_CONFIG.queues.notifications,
                    msg.content,
                    {
                      headers: { 'x-retry-count': retryCount }
                    }
                  );
                }, delay);
                
                this.channel.ack(msg);
              } else {
                // Move to dead letter queue after max retries
                this.channel.reject(msg, false);
              }
            }
          } catch (error) {
            this.logger.error('Error processing email queue message', error as Error);
            this.channel.reject(msg, false);
          }
        },
        { noAck: false }
      );

      this.logger.info('Email queue processor started');
    } catch (error) {
      this.logger.error('Failed to start email queue processor', error as Error);
      throw error;
    }
  }

  /**
   * Handles email bounce notifications
   */
  public async handleBounce(bounce: IBounceNotification): Promise<void> {
    try {
      this.logger.warn('Email bounce received', {
        email: bounce.email,
        reason: bounce.reason,
        timestamp: bounce.timestamp
      });

      // Publish bounce event to exchange
      await this.channel.publish(
        RABBITMQ_CONFIG.exchange,
        'email.bounce',
        Buffer.from(JSON.stringify(bounce)),
        { persistent: true }
      );

      // Update metrics
      // Implementation specific to metrics collection system
    } catch (error) {
      this.logger.error('Failed to handle bounce notification', error as Error);
    }
  }

  /**
   * Private helper methods
   */
  private async sendWithSendGrid(msg: mail.MailDataRequired): Promise<boolean> {
    try {
      await mail.send(msg);
      return true;
    } catch (error) {
      this.logger.error('SendGrid API error', error as Error);
      throw error;
    }
  }

  private setupCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened - stopping email operations');
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Circuit breaker half-open - testing email operations');
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed - resuming normal operations');
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    if (now - this.lastRateReset >= 1000) {
      this.currentRateCount = 0;
      this.lastRateReset = now;
    }

    if (this.currentRateCount >= RATE_LIMIT_PER_SECOND) {
      return false;
    }

    this.currentRateCount++;
    return true;
  }

  private sanitizeEmailData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeHtml(value, {
          allowedTags: ['b', 'i', 'em', 'strong', 'a'],
          allowedAttributes: {
            'a': ['href']
          }
        });
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private async prepareEmailContent(
    templateId: string,
    data: Record<string, any>
  ): Promise<string> {
    // Implementation would depend on template engine used
    // This is a placeholder for template rendering logic
    return `<html><body>${JSON.stringify(data)}</body></html>`;
  }

  private async handleFailedDelivery(
    to: string,
    notification: INotification,
    correlationId: string
  ): Promise<boolean> {
    try {
      await this.channel.publish(
        RABBITMQ_CONFIG.exchange,
        RABBITMQ_CONFIG.queues.notifications,
        Buffer.from(JSON.stringify({ to, notification, correlationId })),
        {
          persistent: true,
          headers: { 'x-retry-count': 0 }
        }
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to queue failed delivery', error as Error);
      return false;
    }
  }
}