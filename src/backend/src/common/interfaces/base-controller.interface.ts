/**
 * @packageDocumentation
 * @module Common/Interfaces
 * @version 1.0.0
 * 
 * Base controller interface defining standardized REST API endpoints
 * with enhanced type safety, error handling, and monitoring support.
 */

import { Request, Response } from 'express'; // v4.18.2
import { IBaseService, ServiceResponse, PaginationParams } from './base-service.interface';

/**
 * Interface for query string filters with pagination and sorting
 */
interface QueryFilters extends PaginationParams {
  [key: string]: unknown;
}

/**
 * Generic base controller interface that defines standard REST API endpoints.
 * All microservice controllers must implement this interface to ensure
 * consistent API patterns and error handling across the application.
 * 
 * @typeParam T - The model/entity type this controller handles
 */
export interface IBaseController<T extends Record<string, any>> {
  /**
   * GET /resource
   * Retrieves a paginated list of resources with support for filtering and sorting.
   * 
   * @param req - Express request object with query parameters for filtering and pagination
   * @param res - Express response object
   * @returns Promise resolving to paginated list of resources
   * @throws 400 for invalid query parameters
   * @throws 429 for rate limit exceeded
   * @throws 500 for internal server errors
   */
  getAll(
    req: Request<{}, {}, {}, QueryFilters>,
    res: Response
  ): Promise<Response>;

  /**
   * GET /resource/:id
   * Retrieves a single resource by its unique identifier.
   * 
   * @param req - Express request object with resource ID parameter
   * @param res - Express response object
   * @returns Promise resolving to requested resource
   * @throws 400 for invalid ID format
   * @throws 404 for resource not found
   * @throws 429 for rate limit exceeded
   * @throws 500 for internal server errors
   */
  getById(
    req: Request<{ id: string }, {}, {}>,
    res: Response
  ): Promise<Response>;

  /**
   * POST /resource
   * Creates a new resource with the provided data.
   * 
   * @param req - Express request object with resource data in body
   * @param res - Express response object
   * @returns Promise resolving to created resource
   * @throws 400 for invalid request body
   * @throws 409 for resource conflicts
   * @throws 429 for rate limit exceeded
   * @throws 500 for internal server errors
   */
  create(
    req: Request<{}, {}, T>,
    res: Response
  ): Promise<Response>;

  /**
   * PUT /resource/:id
   * Updates an existing resource with the provided data.
   * 
   * @param req - Express request object with resource ID parameter and update data
   * @param res - Express response object
   * @returns Promise resolving to updated resource
   * @throws 400 for invalid request body or ID format
   * @throws 404 for resource not found
   * @throws 429 for rate limit exceeded
   * @throws 500 for internal server errors
   */
  update(
    req: Request<{ id: string }, {}, Partial<T>>,
    res: Response
  ): Promise<Response>;

  /**
   * DELETE /resource/:id
   * Removes an existing resource by its unique identifier.
   * 
   * @param req - Express request object with resource ID parameter
   * @param res - Express response object
   * @returns Promise resolving to deletion confirmation
   * @throws 400 for invalid ID format
   * @throws 404 for resource not found
   * @throws 429 for rate limit exceeded
   * @throws 500 for internal server errors
   */
  delete(
    req: Request<{ id: string }, {}, {}>,
    res: Response
  ): Promise<Response>;
}