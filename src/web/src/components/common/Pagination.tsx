import React, { useCallback, useMemo, useRef } from 'react';
import classNames from 'classnames'; // v2.3.2
import { ComponentSize } from '../../types/common.types';
import Button from './Button';
import './Pagination.scss';

/**
 * Props interface for the Pagination component
 */
interface PaginationProps {
  /** Current active page number (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback function when page changes */
  onPageChange: (page: number) => void;
  /** Size variant of pagination controls */
  size?: ComponentSize;
  /** Disabled state of pagination */
  disabled?: boolean;
  /** Show first/last page buttons */
  showFirstLast?: boolean;
  /** Maximum number of visible page buttons */
  maxVisiblePages?: number;
  /** Additional CSS class names */
  className?: string;
  /** Accessible label for navigation */
  ariaLabel?: string;
  /** Text direction for RTL support */
  dir?: 'ltr' | 'rtl';
}

/**
 * Generates array of page numbers with ellipsis
 */
const getPageNumbers = (
  currentPage: number,
  totalPages: number,
  maxVisiblePages: number
): Array<number | 'ellipsis'> => {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfVisible = Math.floor(maxVisiblePages / 2);
  const startPage = Math.max(currentPage - halfVisible, 1);
  const endPage = Math.min(currentPage + halfVisible, totalPages);

  const pages: Array<number | 'ellipsis'> = [];

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push('ellipsis');
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return pages;
};

/**
 * A customizable pagination component with Material Design styling
 * and comprehensive accessibility features
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  size = 'MEDIUM',
  disabled = false,
  showFirstLast = true,
  maxVisiblePages = 5,
  className,
  ariaLabel = 'Pagination navigation',
  dir = 'ltr'
}) => {
  // Refs for focus management
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Memoized page numbers array
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages, maxVisiblePages),
    [currentPage, totalPages, maxVisiblePages]
  );

  // Handle page change with validation and accessibility
  const handlePageChange = useCallback(
    (pageNumber: number) => {
      if (
        disabled ||
        pageNumber === currentPage ||
        pageNumber < 1 ||
        pageNumber > totalPages
      ) {
        return;
      }

      onPageChange(pageNumber);

      // Announce page change to screen readers
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Page ${pageNumber} of ${totalPages}`;
      }
    },
    [currentPage, totalPages, disabled, onPageChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePageChange(dir === 'rtl' ? currentPage + 1 : currentPage - 1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          handlePageChange(dir === 'rtl' ? currentPage - 1 : currentPage + 1);
          break;
        case 'Home':
          event.preventDefault();
          handlePageChange(1);
          break;
        case 'End':
          event.preventDefault();
          handlePageChange(totalPages);
          break;
      }
    },
    [currentPage, totalPages, disabled, handlePageChange, dir]
  );

  const paginationClasses = classNames(
    'md3-pagination',
    `md3-pagination--${size.toLowerCase()}`,
    {
      'md3-pagination--disabled': disabled,
      'md3-pagination--rtl': dir === 'rtl'
    },
    className
  );

  return (
    <nav
      ref={containerRef}
      className={paginationClasses}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      dir={dir}
    >
      {/* Live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        className="md3-pagination__live-region"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* First page button */}
      {showFirstLast && (
        <Button
          variant="outlined"
          size={size}
          onClick={() => handlePageChange(1)}
          disabled={disabled || currentPage === 1}
          ariaLabel="Go to first page"
          className="md3-pagination__first"
        >
          ⟪
        </Button>
      )}

      {/* Previous page button */}
      <Button
        variant="outlined"
        size={size}
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        ariaLabel="Go to previous page"
        className="md3-pagination__previous"
      >
        ‹
      </Button>

      {/* Page number buttons */}
      <div className="md3-pagination__pages" role="group">
        {pageNumbers.map((pageNumber, index) =>
          pageNumber === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="md3-pagination__ellipsis"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <Button
              key={pageNumber}
              variant={pageNumber === currentPage ? 'contained' : 'outlined'}
              size={size}
              onClick={() => handlePageChange(pageNumber)}
              disabled={disabled}
              ariaLabel={`Go to page ${pageNumber}`}
              aria-current={pageNumber === currentPage ? 'page' : undefined}
              className="md3-pagination__page"
            >
              {pageNumber}
            </Button>
          )
        )}
      </div>

      {/* Next page button */}
      <Button
        variant="outlined"
        size={size}
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        ariaLabel="Go to next page"
        className="md3-pagination__next"
      >
        ›
      </Button>

      {/* Last page button */}
      {showFirstLast && (
        <Button
          variant="outlined"
          size={size}
          onClick={() => handlePageChange(totalPages)}
          disabled={disabled || currentPage === totalPages}
          ariaLabel="Go to last page"
          className="md3-pagination__last"
        >
          ⟫
        </Button>
      )}
    </nav>
  );
};

export default Pagination;