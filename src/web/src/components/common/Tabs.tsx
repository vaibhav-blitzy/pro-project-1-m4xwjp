import React, { useState, useCallback, memo } from 'react'; // v18.2.0
import { Tabs as MuiTabs, Tab as MuiTab, Box } from '@mui/material'; // v5.14.0
import type { ComponentSize } from '../../types/common.types';

/**
 * Interface for TabPanel props following ARIA best practices
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  size: ComponentSize;
}

/**
 * Interface for CustomTabs component props
 */
interface CustomTabsProps {
  children: React.ReactNode[];
  tabLabels: string[];
  size?: ComponentSize;
  className?: string;
  centered?: boolean;
  onChange?: (index: number) => void;
  defaultTab?: number;
  'aria-label'?: string;
}

/**
 * Generates accessibility attributes for tabs and panels
 * @param {number} index - The index of the tab/panel
 * @returns {Object} Object containing ARIA and accessibility attributes
 */
const a11yProps = (index: number) => ({
  id: `tab-${index}`,
  'aria-controls': `tabpanel-${index}`,
  role: 'tab',
  tabIndex: 0,
  'aria-selected': false,
});

/**
 * Renders an accessible tab panel with proper ARIA attributes
 * @param {TabPanelProps} props - The props for the tab panel
 * @returns {JSX.Element} The rendered tab panel
 */
const TabPanel = memo(({ children, value, index, size }: TabPanelProps) => {
  // Calculate padding based on component size
  const getPadding = () => {
    switch (size) {
      case 'SMALL':
        return 1;
      case 'LARGE':
        return 3;
      default:
        return 2;
    }
  };

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: getPadding() }}>
          {children}
        </Box>
      )}
    </div>
  );
});

TabPanel.displayName = 'TabPanel';

/**
 * CustomTabs component implementing Material Design 3 specifications
 * with comprehensive accessibility support and responsive design
 */
const CustomTabs = memo(({
  children,
  tabLabels,
  size = 'MEDIUM',
  className,
  centered = false,
  onChange,
  defaultTab = 0,
  'aria-label': ariaLabel = 'Navigation tabs'
}: CustomTabsProps) => {
  const [value, setValue] = useState(defaultTab);

  /**
   * Handles tab change events with accessibility considerations
   * @param {React.SyntheticEvent} event - The event object
   * @param {number} newValue - The index of the newly selected tab
   */
  const handleChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    event.preventDefault();
    setValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  // Calculate size-based styles
  const getTabStyles = () => {
    switch (size) {
      case 'SMALL':
        return {
          minHeight: '32px',
          fontSize: '0.875rem',
          padding: '6px 12px'
        };
      case 'LARGE':
        return {
          minHeight: '48px',
          fontSize: '1.125rem',
          padding: '12px 24px'
        };
      default:
        return {
          minHeight: '40px',
          fontSize: '1rem',
          padding: '8px 16px'
        };
    }
  };

  const tabStyles = getTabStyles();

  return (
    <Box
      className={className}
      sx={{
        width: '100%',
        marginBottom: size === 'SMALL' ? 1 : size === 'LARGE' ? 3 : 2
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <MuiTabs
          value={value}
          onChange={handleChange}
          aria-label={ariaLabel}
          centered={centered}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': tabStyles,
            '& .MuiTabs-indicator': {
              height: '2px'
            }
          }}
        >
          {tabLabels.map((label, index) => (
            <MuiTab
              key={`tab-${index}`}
              label={label}
              {...a11yProps(index)}
              sx={{
                textTransform: 'none', // MD3 specification
                '&.Mui-selected': {
                  fontWeight: 500
                }
              }}
            />
          ))}
        </MuiTabs>
      </Box>
      {React.Children.map(children, (child, index) => (
        <TabPanel
          key={`panel-${index}`}
          value={value}
          index={index}
          size={size}
        >
          {child}
        </TabPanel>
      ))}
    </Box>
  );
});

CustomTabs.displayName = 'CustomTabs';

export default CustomTabs;
export type { CustomTabsProps };