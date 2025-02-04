/**
 * @fileoverview Enhanced Material Design 3 Dropdown Component
 * Implements single/multi-select, virtualization, search, and accessibility
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'; // v18.2.0
import { useTheme, styled } from '@mui/material'; // v5.14.0
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0
import { BaseProps, ThemeConfig } from '../../interfaces/common.interface';

// Constants for keyboard navigation and accessibility
const KEYS = {
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab',
};

const DEBOUNCE_DELAY = 150;
const VIRTUAL_LIST_OVERSCAN = 5;
const ITEM_HEIGHT = 48; // Material Design 3 list item height

// Interfaces
interface DropdownOption {
  id: string;
  label: string;
  value: any;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface DropdownProps extends BaseProps {
  options: DropdownOption[];
  value?: string | string[];
  onChange: (value: string | string[], option: DropdownOption | DropdownOption[]) => void;
  multiSelect?: boolean;
  searchable?: boolean;
  virtualize?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxHeight?: number;
  loading?: boolean;
  error?: string;
  required?: boolean;
  'aria-label'?: string;
}

// Styled components following Material Design 3
const DropdownContainer = styled('div')<{ error?: boolean }>(({ theme, error }) => ({
  position: 'relative',
  width: '100%',
  fontFamily: theme.typography.fontFamily,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
  '&:focus-within': {
    borderColor: error ? theme.palette.error.main : theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${error ? theme.palette.error.main : theme.palette.primary.main}25`,
  },
}));

const DropdownTrigger = styled('button')(({ theme }) => ({
  width: '100%',
  minHeight: '48px',
  padding: '8px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: theme.palette.text.primary,
  '&:disabled': {
    cursor: 'not-allowed',
    opacity: 0.6,
  },
}));

const OptionsList = styled('ul')<{ maxHeight?: number }>(({ theme, maxHeight }) => ({
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: theme.zIndex.modal,
  margin: '4px 0',
  padding: 0,
  listStyle: 'none',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3],
  maxHeight: maxHeight || 300,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
}));

const OptionItem = styled('li')<{ selected?: boolean; active?: boolean }>(
  ({ theme, selected, active }) => ({
    minHeight: ITEM_HEIGHT,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    backgroundColor: selected
      ? theme.palette.primary.main + '14'
      : active
      ? theme.palette.action.hover
      : 'transparent',
    color: selected ? theme.palette.primary.main : theme.palette.text.primary,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&[aria-disabled="true"]': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  }),
);

const SearchInput = styled('input')(({ theme }) => ({
  width: '100%',
  padding: '8px 16px',
  border: 'none',
  borderBottom: `1px solid ${theme.palette.divider}`,
  outline: 'none',
  background: 'transparent',
  color: theme.palette.text.primary,
  '&::placeholder': {
    color: theme.palette.text.secondary,
  },
}));

// Custom hooks
const useClickOutside = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [ref, callback]);
};

const useSearch = (options: DropdownOption[], debounceMs: number = DEBOUNCE_DELAY) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const debounceTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      const filtered = options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredOptions(filtered);
    }, debounceMs);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchTerm, options, debounceMs]);

  return { filteredOptions, searchTerm, setSearchTerm };
};

// Main component
export const Dropdown: React.FC<DropdownProps> = React.memo(({
  options,
  value,
  onChange,
  multiSelect = false,
  searchable = false,
  virtualize = false,
  disabled = false,
  placeholder = 'Select option',
  maxHeight = 300,
  loading = false,
  error,
  required = false,
  'aria-label': ariaLabel,
  className,
  style,
}) => {
  const theme = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { filteredOptions, searchTerm, setSearchTerm } = useSearch(options);

  const virtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => dropdownRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: VIRTUAL_LIST_OVERSCAN,
  });

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const handleKeyboardNavigation = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case KEYS.ARROW_UP:
          event.preventDefault();
          setActiveIndex((prev) => Math.max(0, prev - 1));
          break;
        case KEYS.ARROW_DOWN:
          event.preventDefault();
          setActiveIndex((prev) => Math.min(filteredOptions.length - 1, prev + 1));
          break;
        case KEYS.ENTER:
        case KEYS.SPACE:
          event.preventDefault();
          if (activeIndex >= 0) {
            handleOptionSelect(filteredOptions[activeIndex]);
          }
          break;
        case KEYS.ESCAPE:
          setIsOpen(false);
          break;
        case KEYS.HOME:
          event.preventDefault();
          setActiveIndex(0);
          break;
        case KEYS.END:
          event.preventDefault();
          setActiveIndex(filteredOptions.length - 1);
          break;
      }
    },
    [activeIndex, filteredOptions],
  );

  const handleOptionSelect = useCallback(
    (option: DropdownOption) => {
      if (disabled || option.disabled) return;

      if (multiSelect) {
        const currentValues = Array.isArray(value) ? value : [];
        const newValues = currentValues.includes(option.value)
          ? currentValues.filter((v) => v !== option.value)
          : [...currentValues, option.value];
        
        const selectedOptions = options.filter((opt) => newValues.includes(opt.value));
        onChange(newValues, selectedOptions);
      } else {
        onChange(option.value, option);
        setIsOpen(false);
      }
    },
    [disabled, multiSelect, value, options, onChange],
  );

  const renderOptions = () => {
    const items = virtualize
      ? virtualizer.getVirtualItems()
      : filteredOptions.map((_, index) => ({ index }));

    return items.map((virtualRow) => {
      const option = filteredOptions[virtualRow.index];
      const isSelected = multiSelect
        ? Array.isArray(value) && value.includes(option.value)
        : value === option.value;

      return (
        <OptionItem
          key={option.id}
          selected={isSelected}
          active={activeIndex === virtualRow.index}
          onClick={() => handleOptionSelect(option)}
          role="option"
          aria-selected={isSelected}
          aria-disabled={option.disabled}
          data-testid={`dropdown-option-${option.id}`}
          style={virtualize ? {
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          } : undefined}
        >
          {option.icon && <span className="option-icon">{option.icon}</span>}
          {option.label}
        </OptionItem>
      );
    });
  };

  return (
    <DropdownContainer
      ref={dropdownRef}
      className={className}
      style={style}
      error={!!error}
      onKeyDown={handleKeyboardNavigation}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-label={ariaLabel}
      data-testid="dropdown-container"
    >
      <DropdownTrigger
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-required={required}
        data-testid="dropdown-trigger"
      >
        <span>
          {value
            ? multiSelect
              ? `${Array.isArray(value) ? value.length : 0} selected`
              : options.find((opt) => opt.value === value)?.label
            : placeholder}
        </span>
      </DropdownTrigger>

      {isOpen && (
        <OptionsList
          maxHeight={maxHeight}
          role="listbox"
          aria-multiselectable={multiSelect}
          data-testid="dropdown-options-list"
        >
          {searchable && (
            <SearchInput
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              aria-label="Search options"
              data-testid="dropdown-search-input"
            />
          )}
          {loading ? (
            <OptionItem disabled>Loading...</OptionItem>
          ) : filteredOptions.length === 0 ? (
            <OptionItem disabled>No options available</OptionItem>
          ) : (
            renderOptions()
          )}
        </OptionsList>
      )}
    </DropdownContainer>
  );
});

Dropdown.displayName = 'Dropdown';

export type { DropdownProps, DropdownOption };