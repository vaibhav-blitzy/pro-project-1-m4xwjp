import { compare } from 'bcrypt'; // v5.1.0
import Redis from 'ioredis'; // v5.3.2
import { authenticator } from 'otplib'; // v12.0.1
import { IAuthService } from '../interfaces/auth.interface';
import { TokenService } from './token.service';
import { IUser } from '../../user-service/interfaces/user.interface';
import { Logger } from '../../common/utils/logger.util';
import { encrypt } from '../../common/utils/encryption.util';

// Constants for security configurations
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const MFA_TOKEN_WINDOW = 5 * 60 * 1000; // 5 minutes

export class AuthService implements IAuthService {
  private readonly logger: Logger;
  private readonly rateLimitMap: Map<string, { attempts: number; blockedUntil?: number }>;
  private readonly sessionPrefix = 'session:';
  private readonly mfaPrefix = 'mfa:';

  constructor(
    private readonly tokenService: TokenService,
    private readonly redisClient: Redis
  ) {
    this.logger = Logger.getInstance();
    this.rateLimitMap = new Map();
    this.initializeService().catch(error => {
      this.logger.error('Failed to initialize AuthService', error);
      throw error;
    });
  }

  private async initializeService(): Promise<void> {
    try {
      // Verify Redis connection
      await this.redisClient.ping();
      this.logger.info('AuthService initialized successfully');
    } catch (error) {
      this.logger.error('Redis connection failed', error as Error);
      throw error;
    }
  }

  public async login(credentials: { email: string; password: string; mfaToken?: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  }> {
    try {
      const { email, password, mfaToken } = credentials;

      // Check rate limiting
      const rateLimitKey = `ratelimit:login:${email.toLowerCase()}`;
      const rateLimit = this.rateLimitMap.get(rateLimitKey);

      if (rateLimit?.blockedUntil && rateLimit.blockedUntil > Date.now()) {
        throw new Error('Account temporarily locked. Please try again later.');
      }

      // Validate user credentials (mock user lookup - replace with actual user service)
      const user = await this.lookupUser(email);
      if (!user) {
        await this.incrementLoginAttempts(rateLimitKey);
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await compare(password, user.hashedPassword);
      if (!isPasswordValid) {
        await this.incrementLoginAttempts(rateLimitKey);
        throw new Error('Invalid credentials');
      }

      // Verify MFA if enabled
      if (user.mfaEnabled) {
        if (!mfaToken) {
          throw new Error('MFA token required');
        }

        const isMfaValid = await this.validateMfaToken(user.id, mfaToken);
        if (!isMfaValid) {
          await this.incrementLoginAttempts(rateLimitKey);
          throw new Error('Invalid MFA token');
        }
      }

      // Generate tokens
      const tokens = await this.tokenService.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Store session data
      const sessionId = await this.createSession(user.id, tokens.refreshToken);

      // Clear rate limiting after successful login
      this.rateLimitMap.delete(rateLimitKey);

      // Update last login timestamp
      await this.updateLastLogin(user.id);

      this.logger.info('User logged in successfully', { userId: user.id, sessionId });

      return {
        ...tokens,
        expiresIn: TOKEN_EXPIRY / 1000
      };
    } catch (error) {
      this.logger.error('Login failed', error as Error);
      throw error;
    }
  }

  public async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  }> {
    try {
      // Validate refresh token
      const decoded = await this.tokenService.validateRefreshToken(refreshToken);

      // Generate new token pair
      const tokens = await this.tokenService.rotateRefreshToken(refreshToken);

      // Update session with new refresh token
      await this.updateSession(decoded.sub as string, refreshToken, tokens.refreshToken);

      this.logger.info('Token refreshed successfully', { userId: decoded.sub });

      return {
        ...tokens,
        expiresIn: TOKEN_EXPIRY / 1000
      };
    } catch (error) {
      this.logger.error('Token refresh failed', error as Error);
      throw error;
    }
  }

  public async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      // Revoke refresh token
      await this.tokenService.revokeToken(refreshToken);

      // Clear session
      await this.clearSession(userId);

      this.logger.info('User logged out successfully', { userId });
    } catch (error) {
      this.logger.error('Logout failed', error as Error);
      throw error;
    }
  }

  public async validateSession(sessionId: string, accessToken: string): Promise<boolean> {
    try {
      // Validate access token
      const decoded = await this.tokenService.validateAccessToken(accessToken);

      // Check session existence and validity
      const session = await this.redisClient.get(`${this.sessionPrefix}${sessionId}`);
      if (!session) {
        return false;
      }

      // Update session activity
      await this.redisClient.expire(`${this.sessionPrefix}${sessionId}`, TOKEN_EXPIRY / 1000);

      return true;
    } catch (error) {
      this.logger.error('Session validation failed', error as Error);
      return false;
    }
  }

  private async incrementLoginAttempts(key: string): Promise<void> {
    const current = this.rateLimitMap.get(key) || { attempts: 0 };
    current.attempts += 1;

    if (current.attempts >= MAX_LOGIN_ATTEMPTS) {
      current.blockedUntil = Date.now() + LOGIN_BLOCK_DURATION;
      this.logger.warn('Account locked due to multiple failed attempts', { key });
    }

    this.rateLimitMap.set(key, current);
  }

  private async createSession(userId: string, refreshToken: string): Promise<string> {
    const sessionId = await encrypt(userId + Date.now());
    const sessionData = {
      userId,
      refreshToken,
      createdAt: Date.now()
    };

    await this.redisClient.setex(
      `${this.sessionPrefix}${sessionId}`,
      REFRESH_TOKEN_EXPIRY / 1000,
      JSON.stringify(sessionData)
    );

    return sessionId;
  }

  private async updateSession(userId: string, oldRefreshToken: string, newRefreshToken: string): Promise<void> {
    const sessionKey = await this.findSessionByRefreshToken(oldRefreshToken);
    if (sessionKey) {
      const sessionData = {
        userId,
        refreshToken: newRefreshToken,
        updatedAt: Date.now()
      };

      await this.redisClient.setex(
        sessionKey,
        REFRESH_TOKEN_EXPIRY / 1000,
        JSON.stringify(sessionData)
      );
    }
  }

  private async clearSession(userId: string): Promise<void> {
    const pattern = `${this.sessionPrefix}*`;
    const keys = await this.redisClient.keys(pattern);
    
    for (const key of keys) {
      const session = await this.redisClient.get(key);
      if (session) {
        const sessionData = JSON.parse(session);
        if (sessionData.userId === userId) {
          await this.redisClient.del(key);
        }
      }
    }
  }

  private async validateMfaToken(userId: string, token: string): Promise<boolean> {
    const mfaSecret = await this.redisClient.get(`${this.mfaPrefix}${userId}`);
    if (!mfaSecret) {
      return false;
    }

    return authenticator.verify({
      token,
      secret: mfaSecret
    });
  }

  private async findSessionByRefreshToken(refreshToken: string): Promise<string | null> {
    const pattern = `${this.sessionPrefix}*`;
    const keys = await this.redisClient.keys(pattern);

    for (const key of keys) {
      const session = await this.redisClient.get(key);
      if (session) {
        const sessionData = JSON.parse(session);
        if (sessionData.refreshToken === refreshToken) {
          return key;
        }
      }
    }

    return null;
  }

  private async lookupUser(email: string): Promise<IUser | null> {
    // Mock implementation - replace with actual user service call
    return null;
  }

  private async updateLastLogin(userId: string): Promise<void> {
    // Mock implementation - replace with actual user service call
  }
}