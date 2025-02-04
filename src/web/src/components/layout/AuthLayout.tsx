/**
 * @fileoverview Authentication Layout Component
 * Implements Material Design 3 layout principles for authentication pages
 * with responsive design and enhanced security features
 * @version 1.0.0
 */

import React, { useEffect } from 'react'; // v18.2.0
import { Box, Container, useTheme, useMediaQuery } from '@mui/material'; // v5.14.0
import { styled } from '@mui/material/styles'; // v5.14.0
import { Navigate } from 'react-router-dom'; // v6.14.0
import { Card } from '../common/Card';
import { useAuth } from '../../hooks/useAuth';
import { GRID, BREAKPOINTS, THEME_CONSTANTS } from '../../constants/app.constants';

/**
 * Props interface for AuthLayout component
 */
interface AuthLayoutProps {
  /** Content to be rendered inside the layout */
  children: React.ReactNode;
  /** Optional title for the auth page */
  title?: string;
  /** Maximum width of the auth container */
  maxWidth?: number;
  /** Card elevation level (0-24) */
  elevation?: number;
}

/**
 * Styled container component with responsive behavior
 */
const AuthContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(GRID.MULTIPLIER.MEDIUM),
  backgroundColor: THEME_CONSTANTS.COLOR_TOKENS.background,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(GRID.MULTIPLIER.SMALL),
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(GRID.MULTIPLIER.LARGE),
  }
}));

/**
 * Styled card component with enhanced visual effects
 */
const AuthCard = styled(Card)<{ maxWidth?: number }>(({ theme, maxWidth }) => ({
  width: '100%',
  maxWidth: maxWidth ?? 440,
  padding: theme.spacing(GRID.MULTIPLIER.LARGE),
  transition: theme.transitions.create(['box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  borderRadius: THEME_CONSTANTS.ELEVATION.level2,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(GRID.MULTIPLIER.MEDIUM),
    maxWidth: '100%',
  }
}));

/**
 * Styled title component
 */
const AuthTitle = styled(Box)(({ theme }) => ({
  ...THEME_CONSTANTS.TYPOGRAPHY.headlineLarge,
  color: THEME_CONSTANTS.COLOR_TOKENS.onBackground,
  marginBottom: theme.spacing(GRID.MULTIPLIER.LARGE),
  textAlign: 'center'
}));

/**
 * AuthLayout component providing a standardized layout for authentication pages
 * with responsive design and security features
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  maxWidth,
  elevation = 3
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAuthenticated, sessionTimeout } = useAuth();

  // Handle session timeout cleanup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (sessionTimeout) {
      timeoutId = setTimeout(() => {
        // Session timeout handling will be managed by useAuth
      }, sessionTimeout);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [sessionTimeout]);

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Calculate responsive padding
  const containerPadding = isMobile
    ? GRID.MULTIPLIER.SMALL
    : GRID.MULTIPLIER.MEDIUM;

  return (
    <AuthContainer maxWidth={false}>
      <AuthCard
        size="LARGE"
        variant="elevated"
        elevation={elevation}
        maxWidth={maxWidth}
        role="main"
        aria-label="Authentication form"
      >
        {title && (
          <AuthTitle component="h1" aria-label={title}>
            {title}
          </AuthTitle>
        )}
        <Box
          sx={{
            padding: theme.spacing(containerPadding),
            [theme.breakpoints.up('sm')]: {
              padding: theme.spacing(GRID.MULTIPLIER.MEDIUM)
            }
          }}
        >
          {children}
        </Box>
      </AuthCard>
    </AuthContainer>
  );
};

export default AuthLayout;