import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Checkbox,
  Skeleton,
  Paper,
  useMediaQuery,
  useTheme
} from '@mui/material'; // v5.14.0
import classNames from 'classnames'; // v2.3.2
import { ComponentSize } from '../../types/common.types';
import Pagination from './Pagination';
import './Table.scss';

interface TableColumn {
  id: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  renderCell?: (row: any) => React.ReactNode;
  sortField?: string;
  minWidth?: number;
  maxWidth?: number;
  hideOnMobile?: boolean;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
  size?: ComponentSize;
  loading?: boolean;
  selectable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  onSort?: (columnId: string, direction: 'asc' | 'desc', sortField?: string) => void;
  onSelect?: (selectedRows: any[]) => void;
  onRowClick?: (row: any) => void;
  className?: string;
  multiSort?: boolean;
  defaultSort?: { columnId: string; direction: 'asc' | 'desc' }[];
  stickyHeader?: boolean;
  virtualized?: boolean;
  rowHeight?: number;
  ariaLabel?: string;
  noDataMessage?: string;
}

interface SortConfig {
  columnId: string;
  direction: 'asc' | 'desc';
  sortField?: string;
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  size = 'MEDIUM',
  loading = false,
  selectable = false,
  pagination = false,
  pageSize = 10,
  onSort,
  onSelect,
  onRowClick,
  className,
  multiSort = false,
  defaultSort = [],
  stickyHeader = true,
  virtualized = false,
  rowHeight = 48,
  ariaLabel = 'Data table',
  noDataMessage = 'No data available'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const containerRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig[]>(defaultSort);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter columns based on mobile visibility
  const visibleColumns = useMemo(() => 
    columns.filter(column => !isMobile || !column.hideOnMobile),
    [columns, isMobile]
  );

  // Calculate total pages for pagination
  const totalPages = useMemo(() => 
    Math.ceil(data.length / pageSize),
    [data.length, pageSize]
  );

  // Get current page data
  const currentData = useMemo(() => {
    if (!pagination) return data;
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize, pagination]);

  // Handle sort
  const handleSort = useCallback((columnId: string, sortField?: string) => {
    if (!onSort) return;

    setSortConfig(prevSort => {
      const columnSort = prevSort.find(sort => sort.columnId === columnId);
      const newDirection = columnSort?.direction === 'asc' ? 'desc' : 'asc';

      let newSort: SortConfig[];
      if (multiSort) {
        newSort = columnSort
          ? prevSort.map(sort =>
              sort.columnId === columnId
                ? { ...sort, direction: newDirection }
                : sort
            )
          : [...prevSort, { columnId, direction: 'asc', sortField }];
      } else {
        newSort = [{ columnId, direction: columnSort ? newDirection : 'asc', sortField }];
      }

      onSort(columnId, newSort[0].direction, sortField);
      return newSort;
    });
  }, [onSort, multiSort]);

  // Handle row selection
  const handleSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>, row?: any) => {
    setSelectedRows(prevSelected => {
      let newSelected: any[];
      if (row === undefined) { // Select all
        newSelected = event.target.checked ? currentData : [];
      } else {
        newSelected = event.target.checked
          ? [...prevSelected, row]
          : prevSelected.filter(item => item !== row);
      }
      onSelect?.(newSelected);
      return newSelected;
    });
  }, [currentData, onSelect]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!containerRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const rows = containerRef.current?.querySelectorAll('tr[role="row"]');
        const currentRow = document.activeElement?.closest('tr');
        const currentIndex = Array.from(rows || []).indexOf(currentRow as HTMLTableRowElement);
        const nextIndex = event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;

        if (nextIndex >= 0 && nextIndex < rows.length) {
          (rows[nextIndex] as HTMLTableRowElement).focus();
        }
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown);
    return () => containerRef.current?.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render loading skeleton
  const renderSkeleton = () => (
    <TableBody>
      {Array.from({ length: pageSize }).map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
          {selectable && (
            <TableCell padding="checkbox">
              <Skeleton variant="rectangular" width={20} height={20} />
            </TableCell>
          )}
          {visibleColumns.map((column, cellIndex) => (
            <TableCell
              key={`skeleton-cell-${cellIndex}`}
              align={column.align}
              style={{ width: column.width }}
            >
              <Skeleton variant="text" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );

  const tableClasses = classNames(
    'md3-table',
    `md3-table--${size.toLowerCase()}`,
    {
      'md3-table--selectable': selectable,
      'md3-table--clickable': !!onRowClick,
      'md3-table--sticky-header': stickyHeader,
      'md3-table--mobile': isMobile
    },
    className
  );

  return (
    <div ref={containerRef} className={tableClasses}>
      <TableContainer component={Paper}>
        <MuiTable
          aria-label={ariaLabel}
          size={size === 'SMALL' ? 'small' : 'medium'}
          stickyHeader={stickyHeader}
        >
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < currentData.length}
                    checked={selectedRows.length === currentData.length}
                    onChange={(event) => handleSelect(event)}
                    inputProps={{ 'aria-label': 'Select all rows' }}
                  />
                </TableCell>
              )}
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth
                  }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortConfig.some(sort => sort.columnId === column.id)}
                      direction={
                        sortConfig.find(sort => sort.columnId === column.id)?.direction || 'asc'
                      }
                      onClick={() => handleSort(column.id, column.sortField)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          
          {loading ? (
            renderSkeleton()
          ) : (
            <TableBody>
              {currentData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={selectable ? visibleColumns.length + 1 : visibleColumns.length}
                    align="center"
                  >
                    {noDataMessage}
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((row, index) => (
                  <TableRow
                    key={index}
                    hover
                    onClick={() => onRowClick?.(row)}
                    selected={selectedRows.includes(row)}
                    tabIndex={0}
                    role="row"
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRows.includes(row)}
                          onChange={(event) => handleSelect(event, row)}
                          inputProps={{ 'aria-label': `Select row ${index + 1}` }}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.map((column) => (
                      <TableCell
                        key={column.id}
                        align={column.align}
                      >
                        {column.renderCell ? column.renderCell(row) : row[column.id]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          )}
        </MuiTable>
      </TableContainer>

      {pagination && data.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          size={size}
          disabled={loading}
        />
      )}
    </div>
  );
};

export default Table;