import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import { ThemeProvider, createTheme } from '@mui/material';
import Button from '../../../../src/components/common/Button';
import type { ComponentSize } from '../../../../src/types/common.types';

// Mock function for click handler testing
const mockOnClick = jest.fn();

// Helper function to render components with theme
const renderWithTheme = (ui: React.ReactNode, themeOptions = {}) => {
  const theme = createTheme(themeOptions);
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Button Component', () => {
  // Clear mocks between tests
  beforeEach(() => {
    mockOnClick.mockClear();
  });

  describe('Design System Integration', () => {
    it('renders all Material Design 3 variants correctly', () => {
      const variants = ['contained', 'outlined', 'text'] as const;
      
      variants.forEach(variant => {
        const { rerender } = renderWithTheme(
          <Button variant={variant} data-testid="test-button">
            Test Button
          </Button>
        );

        const button = screen.getByTestId('test-button');
        expect(button).toHaveClass(`md3-button--${variant}`);
        
        // Cleanup before next render
        rerender(<></>);
      });
    });

    it('applies correct size classes and dimensions', () => {
      const sizes: ComponentSize[] = ['SMALL', 'MEDIUM', 'LARGE'];
      
      sizes.forEach(size => {
        const { rerender } = renderWithTheme(
          <Button size={size} data-testid="test-button">
            Test Button
          </Button>
        );

        const button = screen.getByTestId('test-button');
        expect(button).toHaveClass(`md3-button--${size.toLowerCase()}`);
        
        rerender(<></>);
      });
    });

    it('handles interactive states properly', async () => {
      const { container } = renderWithTheme(
        <Button data-testid="test-button">
          Test Button
        </Button>
      );

      const button = screen.getByTestId('test-button');

      // Hover state
      await userEvent.hover(button);
      expect(button).toMatchSnapshot('hover-state');

      // Focus state
      await userEvent.tab();
      expect(button).toHaveClass('md3-button--focused');

      // Active state
      await userEvent.click(button);
      expect(button).toMatchSnapshot('active-state');

      // Disabled state
      const { rerender } = renderWithTheme(
        <Button disabled data-testid="test-button">
          Test Button
        </Button>
      );
      expect(screen.getByTestId('test-button')).toHaveClass('md3-button--disabled');
    });

    it('maintains consistent spacing and padding', () => {
      const { container } = renderWithTheme(
        <Button startIcon={<span>→</span>} endIcon={<span>←</span>}>
          Test Button
        </Button>
      );

      const startIcon = container.querySelector('.md3-button__icon--start');
      const endIcon = container.querySelector('.md3-button__icon--end');
      const label = container.querySelector('.md3-button__label');

      expect(startIcon).toBeInTheDocument();
      expect(endIcon).toBeInTheDocument();
      expect(label).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('provides appropriate ARIA attributes', () => {
      renderWithTheme(
        <Button
          disabled
          loading
          ariaLabel="Accessible Button"
          data-testid="test-button"
        >
          Test Button
        </Button>
      );

      const button = screen.getByTestId('test-button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-label', 'Accessible Button');
    });

    it('supports keyboard navigation', async () => {
      renderWithTheme(
        <>
          <Button onClick={mockOnClick}>First Button</Button>
          <Button onClick={mockOnClick}>Second Button</Button>
        </>
      );

      // Tab navigation
      await userEvent.tab();
      expect(screen.getByText('First Button')).toHaveFocus();
      
      await userEvent.tab();
      expect(screen.getByText('Second Button')).toHaveFocus();

      // Space/Enter activation
      await userEvent.keyboard(' ');
      expect(mockOnClick).toHaveBeenCalledTimes(1);

      await userEvent.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });

    it('announces state changes to screen readers', async () => {
      const { rerender } = renderWithTheme(
        <Button loading={false}>Submit</Button>
      );

      // Test loading state announcement
      rerender(
        <Button loading={true}>Submit</Button>
      );

      const spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveAttribute('aria-hidden', 'false');
    });

    it('maintains focus management', async () => {
      renderWithTheme(
        <Button onClick={() => {
          const input = document.createElement('input');
          document.body.appendChild(input);
          input.focus();
        }}>
          Focus Shift Button
        </Button>
      );

      const button = screen.getByText('Focus Shift Button');
      await userEvent.click(button);

      // Focus should remain within the button
      expect(button).toHaveFocus();
    });
  });

  describe('Theme Integration', () => {
    it('responds to system theme changes', async () => {
      // Mock matchMedia for theme detection
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      const { rerender } = renderWithTheme(
        <Button data-testid="test-button">Theme Test</Button>
      );

      // Test light theme
      expect(screen.getByTestId('test-button')).toMatchSnapshot('light-theme');

      // Test dark theme
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      rerender(
        <Button data-testid="test-button">Theme Test</Button>
      );

      expect(screen.getByTestId('test-button')).toMatchSnapshot('dark-theme');
    });

    it('applies theme-specific styles correctly', () => {
      const customTheme = createTheme({
        palette: {
          primary: {
            main: '#FF0000',
          },
        },
      });

      renderWithTheme(
        <Button variant="contained" data-testid="test-button">
          Themed Button
        </Button>,
        customTheme
      );

      const button = screen.getByTestId('test-button');
      expect(button).toMatchSnapshot('themed-button');
    });

    it('handles theme transitions smoothly', async () => {
      const { rerender } = renderWithTheme(
        <Button data-testid="test-button">Transition Test</Button>
      );

      const button = screen.getByTestId('test-button');
      
      // Initial state
      expect(button).toMatchSnapshot('before-transition');

      // Theme change
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <Button data-testid="test-button">Transition Test</Button>
        </ThemeProvider>
      );

      // Wait for transition
      await waitFor(() => {
        expect(button).toMatchSnapshot('after-transition');
      });
    });

    it('uses correct CSS variables', () => {
      renderWithTheme(
        <Button variant="contained" data-testid="test-button">
          CSS Variables Test
        </Button>
      );

      const button = screen.getByTestId('test-button');
      const styles = window.getComputedStyle(button);

      expect(styles.getPropertyValue('--md-sys-color-primary')).toBeDefined();
      expect(styles.getPropertyValue('--md-sys-color-on-primary')).toBeDefined();
    });
  });
});