import { sign, verify } from 'jsonwebtoken'; // v9.0.1
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { IAuthTokens } from '../interfaces/auth.interface';
import { RedisManager } from '../../common/config/redis.config';
import { encrypt } from '../../common/utils/encryption.util';
import { Logger } from '../../common/utils/logger.util';

// Environment variables with defaults
const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET must be provided'); })();
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const TOKEN_VERSION = process.env.TOKEN_VERSION || '1';

/**
 * Enhanced service for secure JWT token operations including generation,
 * validation, storage, and revocation with comprehensive security measures.
 */
export class TokenService {
  private redisClient: RedisManager;
  private logger: Logger;
  private readonly tokenPrefix: string = 'token:';
  private readonly blacklistPrefix: string = 'blacklist:';

  constructor() {
    this.logger = Logger.getInstance();
    this.redisClient = new RedisManager({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: this.tokenPrefix
    });
    this.initializeService().catch(error => {
      this.logger.error('Failed to initialize TokenService', error);
      throw error;
    });
  }

  private async initializeService(): Promise<void> {
    await this.redisClient.connect();
    this.logger.info('TokenService initialized successfully');
  }

  /**
   * Generates secure access and refresh tokens with encrypted payload
   * @param payload - Token payload containing user information
   * @returns Promise resolving to token pair with metadata
   */
  public async generateTokens(payload: Record<string, any>): Promise<IAuthTokens> {
    try {
      // Generate unique identifiers for tokens
      const tokenId = uuidv4();
      const refreshTokenId = uuidv4();

      // Encrypt sensitive payload data
      const encryptedPayload = await encrypt(JSON.stringify({
        ...payload,
        tokenId,
        tokenVersion: TOKEN_VERSION
      }));

      // Generate access token
      const accessToken = sign(
        { sub: payload.userId, jti: tokenId, data: encryptedPayload },
        JWT_SECRET,
        {
          expiresIn: ACCESS_TOKEN_EXPIRY,
          algorithm: 'HS512'
        }
      );

      // Generate refresh token with additional security metadata
      const refreshToken = sign(
        {
          sub: payload.userId,
          jti: refreshTokenId,
          tokenVersion: TOKEN_VERSION,
          accessTokenId: tokenId
        },
        JWT_SECRET,
        {
          expiresIn: REFRESH_TOKEN_EXPIRY,
          algorithm: 'HS512'
        }
      );

      // Store refresh token metadata in Redis
      await this.redisClient.setEx(
        `${this.tokenPrefix}${refreshTokenId}`,
        7 * 24 * 60 * 60, // 7 days in seconds
        JSON.stringify({
          userId: payload.userId,
          tokenId: refreshTokenId,
          accessTokenId: tokenId,
          createdAt: new Date().toISOString()
        })
      );

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hour in seconds
        tokenType: 'Bearer'
      };
    } catch (error) {
      this.logger.error('Token generation failed', error as Error);
      throw new Error('Failed to generate tokens');
    }
  }

  /**
   * Performs comprehensive validation of access token
   * @param token - Access token to validate
   * @returns Promise resolving to validated token payload
   */
  public async validateAccessToken(token: string): Promise<object> {
    try {
      // Verify token structure and signature
      const decoded = verify(token, JWT_SECRET, {
        algorithms: ['HS512']
      });

      // Check if token is blacklisted
      const isBlacklisted = await this.redisClient.get(
        `${this.blacklistPrefix}${decoded.jti}`
      );
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Verify token version
      if (decoded.tokenVersion !== TOKEN_VERSION) {
        throw new Error('Token version is invalid');
      }

      return decoded;
    } catch (error) {
      this.logger.error('Token validation failed', error as Error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Validates refresh token with additional security checks
   * @param token - Refresh token to validate
   * @returns Promise resolving to validated token data
   */
  public async validateRefreshToken(token: string): Promise<object> {
    try {
      // Verify token structure and signature
      const decoded = verify(token, JWT_SECRET, {
        algorithms: ['HS512']
      });

      // Retrieve token metadata from Redis
      const storedToken = await this.redisClient.get(
        `${this.tokenPrefix}${decoded.jti}`
      );
      if (!storedToken) {
        throw new Error('Refresh token not found');
      }

      // Verify token metadata
      const tokenData = JSON.parse(storedToken);
      if (tokenData.accessTokenId !== decoded.accessTokenId) {
        throw new Error('Token chain validation failed');
      }

      return decoded;
    } catch (error) {
      this.logger.error('Refresh token validation failed', error as Error);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Securely revokes token and adds to blacklist
   * @param token - Token to revoke
   */
  public async revokeToken(token: string): Promise<void> {
    try {
      const decoded = verify(token, JWT_SECRET, {
        algorithms: ['HS512']
      });

      // Add to blacklist
      await this.redisClient.setEx(
        `${this.blacklistPrefix}${decoded.jti}`,
        24 * 60 * 60, // 24 hours in seconds
        'revoked'
      );

      // Remove refresh token if exists
      await this.redisClient.del(`${this.tokenPrefix}${decoded.jti}`);

      this.logger.info('Token revoked successfully', { tokenId: decoded.jti });
    } catch (error) {
      this.logger.error('Token revocation failed', error as Error);
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Securely rotates refresh token with enhanced validation
   * @param oldToken - Current refresh token
   * @returns Promise resolving to new token pair
   */
  public async rotateRefreshToken(oldToken: string): Promise<IAuthTokens> {
    try {
      const decoded = await this.validateRefreshToken(oldToken);
      
      // Revoke old refresh token
      await this.revokeToken(oldToken);

      // Generate new token pair
      return await this.generateTokens({
        userId: decoded.sub,
        tokenVersion: TOKEN_VERSION
      });
    } catch (error) {
      this.logger.error('Token rotation failed', error as Error);
      throw new Error('Failed to rotate refresh token');
    }
  }
}