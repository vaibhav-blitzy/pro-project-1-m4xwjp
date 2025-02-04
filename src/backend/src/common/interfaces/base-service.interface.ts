/**
 * @packageDocumentation
 * @module Common/Interfaces
 * @version 1.0.0
 * 
 * Core service layer interfaces providing standardized CRUD operations
 * and data access patterns across the microservices architecture.
 */

import { Prisma } from '@prisma/client'; // v5.0.0

/**
 * Generic interface for standardized service layer responses with enhanced error handling and type safety.
 * Used as a wrapper for all service method returns to ensure consistent error handling and response formatting.
 * 
 * @typeParam T - The type of data being returned, must extend object
 */
export interface ServiceResponse<T extends object> {
  /** Indicates if the operation was successful */
  success: boolean;
  /** Human-readable message describing the result */
  message: string;
  /** The actual data payload, null if operation failed */
  data: T | null;
  /** Error object if operation failed, null otherwise */
  error: Error | null;
  /** Optional error code for categorizing errors */
  errorCode: string | null;
  /** Optional metadata for additional context */
  metadata: Record<string, unknown> | null;
}

/**
 * Interface for standardized pagination parameters with sorting capabilities.
 * Used to provide consistent pagination across all service list operations.
 */
export interface PaginationParams {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Field to sort by */
  sortBy: string;
  /** Sort direction */
  sortOrder: 'asc' | 'desc';
  /** Optional filters to apply to the query */
  filters: Record<string, unknown>;
}

/**
 * Generic base service interface that defines standard CRUD operations.
 * All microservice business logic services must implement this interface
 * to ensure consistent data access patterns across the application.
 * 
 * @typeParam T - The model/entity type this service handles
 */
export interface IBaseService<T extends Record<string, any>> {
  /**
   * Retrieves a paginated list of resources with optional filtering and sorting.
   * 
   * @param options - Pagination, sorting, and filtering parameters
   * @returns Promise resolving to a paginated list of resources with metadata
   */
  findAll(options: PaginationParams): Promise<ServiceResponse<{
    items: T[];
    total: number;
    page: number;
    totalPages: number;
  }>>;

  /**
   * Retrieves a single resource by its unique identifier.
   * 
   * @param id - Unique identifier of the resource
   * @returns Promise resolving to the found resource or error
   */
  findById(id: string): Promise<ServiceResponse<T>>;

  /**
   * Creates a new resource with the provided data.
   * Automatically handles created/updated timestamps.
   * 
   * @param data - Resource data excluding id and timestamps
   * @returns Promise resolving to the created resource
   */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResponse<T>>;

  /**
   * Updates an existing resource with the provided partial data.
   * Automatically handles updated timestamp.
   * 
   * @param id - Unique identifier of the resource to update
   * @param data - Partial resource data excluding id and timestamps
   * @returns Promise resolving to the updated resource
   */
  update(
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ServiceResponse<T>>;

  /**
   * Deletes an existing resource by its unique identifier.
   * May perform soft delete based on configuration.
   * 
   * @param id - Unique identifier of the resource to delete
   * @returns Promise resolving to deletion status
   */
  delete(id: string): Promise<ServiceResponse<{ deleted: boolean }>>;
}