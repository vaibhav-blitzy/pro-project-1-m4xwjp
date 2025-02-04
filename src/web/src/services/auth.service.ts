/**
 * @fileoverview Authentication service implementing secure token management,
 * multiple authentication methods, and comprehensive security features
 * @version 1.0.0
 */

import jwtDecode from 'jwt-decode'; // v3.1.2
import CryptoJS from 'crypto-js'; // v4.1.1
import { AuthCredentials, AuthTokens, AuthResponse } from '../interfaces/auth.interface';
import { StorageService } from './storage.service';

/**
 * Interface for decoded JWT token payload
 */
interface DecodedToken {
  sub: string;
  exp: number;
  iat: number;
  roles: string[];
  sessionId: string;
}

/**
 * Enhanced authentication service implementing secure token management
 * and comprehensive security features
 */
export class AuthService {
  private readonly storageService: StorageService;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly TOKEN_REFRESH_THRESHOLD = 300000; // 5 minutes in milliseconds
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // Base delay for exponential backoff
  private refreshTokenTimeout: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.storageService = new StorageService();
    this.setupSecurityListeners();
  }

  /**
   * Authenticates user with email/password credentials
   * @param credentials - User authentication credentials
   * @returns Promise resolving to authentication response
   */
  public async loginWithCredentials(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      this.validateCredentials(credentials);

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const authResponse: AuthResponse = await response.json();
      
      if (authResponse.success && authResponse.data) {
        await this.handleSuccessfulAuth(authResponse.data);
        return authResponse;
      }

      throw new Error(authResponse.error || 'Authentication failed');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Initiates SSO authentication flow with specified provider
   * @param provider - SSO provider (google or microsoft)
   * @returns Promise resolving to SSO redirect URL
   */
  public async loginWithSsoProvider(provider: 'google' | 'microsoft'): Promise<string> {
    try {
      const response = await fetch(`/api/v1/auth/sso/${provider}/init`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('SSO initialization failed');
      }

      const { ssoRedirectUrl } = await response.json();
      return ssoRedirectUrl;
    } catch (error) {
      console.error('SSO initialization failed:', error);
      throw error;
    }
  }

  /**
   * Refreshes authentication tokens with retry mechanism
   * @returns Promise resolving to new auth tokens
   */
  public async refreshTokenWithRetry(): Promise<AuthTokens> {
    let retryCount = 0;

    while (retryCount < this.MAX_RETRY_ATTEMPTS) {
      try {
        if (this.isRefreshing) {
          return new Promise((resolve) => {
            this.refreshSubscribers.push((token: string) => {
              resolve(this.getTokens());
            });
          });
        }

        this.isRefreshing = true;
        const refreshToken = await this.storageService.getItem<string>(this.REFRESH_TOKEN_KEY);

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const tokens: AuthTokens = await response.json();
        await this.handleSuccessfulAuth(tokens);
        
        this.refreshSubscribers.forEach((callback) => callback(tokens.accessToken));
        this.refreshSubscribers = [];
        
        return tokens;
      } catch (error) {
        retryCount++;
        if (retryCount === this.MAX_RETRY_ATTEMPTS) {
          await this.logout();
          throw error;
        }
        await this.delay(Math.pow(2, retryCount) * this.RETRY_DELAY_BASE);
      } finally {
        this.isRefreshing = false;
      }
    }

    throw new Error('Token refresh failed after maximum retries');
  }

  /**
   * Validates JWT token format and expiration
   * @param token - JWT token to validate
   * @returns boolean indicating token validity
   */
  public validateToken(token: string): boolean {
    try {
      if (!token) return false;

      const decoded = jwtDecode<DecodedToken>(token);
      if (!decoded.exp) return false;

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp > currentTime;
    } catch {
      return false;
    }
  }

  /**
   * Logs out user and cleans up authentication state
   */
  public async logout(): Promise<void> {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.cleanupAuthState();
    }
  }

  /**
   * Gets current authentication tokens
   * @returns Current auth tokens or null if not authenticated
   */
  public async getTokens(): Promise<AuthTokens | null> {
    try {
      const accessToken = await this.storageService.getItem<string>(this.TOKEN_KEY);
      const refreshToken = await this.storageService.getItem<string>(this.REFRESH_TOKEN_KEY);

      if (!accessToken || !refreshToken) {
        return null;
      }

      return {
        accessToken,
        refreshToken,
        expiresIn: this.getTokenExpiration(accessToken),
        tokenType: 'Bearer'
      };
    } catch {
      return null;
    }
  }

  // Private helper methods

  private async handleSuccessfulAuth(tokens: AuthTokens): Promise<void> {
    const encryptedAccess = this.encryptToken(tokens.accessToken);
    const encryptedRefresh = this.encryptToken(tokens.refreshToken);

    await this.storageService.setItem(this.TOKEN_KEY, encryptedAccess);
    await this.storageService.setItem(this.REFRESH_TOKEN_KEY, encryptedRefresh);

    this.scheduleTokenRefresh(tokens.accessToken);
  }

  private scheduleTokenRefresh(token: string): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }

    const expiresIn = this.getTokenExpiration(token);
    const refreshTime = expiresIn - this.TOKEN_REFRESH_THRESHOLD;

    if (refreshTime > 0) {
      this.refreshTokenTimeout = setTimeout(() => {
        this.refreshTokenWithRetry().catch(console.error);
      }, refreshTime);
    }
  }

  private validateCredentials(credentials: AuthCredentials): void {
    if (!credentials.email || !credentials.email.includes('@')) {
      throw new Error('Invalid email format');
    }

    if (!credentials.password || credentials.password.length < 8) {
      throw new Error('Invalid password format');
    }
  }

  private encryptToken(token: string): string {
    const secret = window.crypto.getRandomValues(new Uint8Array(16));
    return CryptoJS.AES.encrypt(token, secret.toString()).toString();
  }

  private getTokenExpiration(token: string): number {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      return (decoded.exp * 1000) - Date.now();
    } catch {
      return 0;
    }
  }

  private setupSecurityListeners(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.TOKEN_KEY || event.key === this.REFRESH_TOKEN_KEY) {
        this.logout().catch(console.error);
      }
    });

    window.addEventListener('offline', () => {
      console.warn('Network connection lost - some authentication features may be limited');
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanupAuthState(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
    
    this.refreshSubscribers = [];
    this.isRefreshing = false;
    
    Promise.all([
      this.storageService.removeItem(this.TOKEN_KEY),
      this.storageService.removeItem(this.REFRESH_TOKEN_KEY)
    ]).catch(console.error);
  }
}