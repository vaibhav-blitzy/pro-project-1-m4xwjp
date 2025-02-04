import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';
import Button from '../../components/common/Button';
import AppLayout from '../../components/layout/AppLayout';
import { ROUTES } from '../../constants/route.constants';
import { THEME_CONSTANTS, GRID } from '../../constants/app.constants';

/**
 * Server error (500) page component that provides a user-friendly error message
 * and recovery options following Material Design 3 principles
 */
const ServerError500: React.FC = () => {
  const navigate = useNavigate();

  /**
   * Handles retry action with error tracking
   */
  const handleRetry = useCallback(() => {
    // Track retry attempt
    try {
      window.location.reload();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }, []);

  /**
   * Handles navigation to home page with tracking
   */
  const handleGoHome = useCallback(() => {
    try {
      navigate(ROUTES.BASE);
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  }, [navigate]);

  return (
    <AppLayout>
      <Container
        maxWidth="md"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          padding: GRID.CONTAINER_PADDING,
        }}
      >
        {/* Error illustration */}
        <Box
          component="img"
          src="/assets/images/500-error.svg"
          alt="Server error illustration"
          sx={{
            width: '100%',
            maxWidth: 400,
            height: 'auto',
            marginBottom: GRID.LAYOUT_SPACING.section,
          }}
        />

        {/* Error heading */}
        <Typography
          variant="h1"
          component="h1"
          sx={{
            ...THEME_CONSTANTS.TYPOGRAPHY.displayLarge,
            color: THEME_CONSTANTS.COLOR_TOKENS.onBackground,
            marginBottom: GRID.LAYOUT_SPACING.component,
          }}
        >
          Server Error
        </Typography>

        {/* Error message */}
        <Typography
          variant="body1"
          sx={{
            ...THEME_CONSTANTS.TYPOGRAPHY.bodyLarge,
            color: THEME_CONSTANTS.COLOR_TOKENS.onBackground,
            marginBottom: GRID.LAYOUT_SPACING.section,
            maxWidth: 600,
          }}
        >
          We're experiencing some technical difficulties. Our team has been notified and is working to resolve the issue. Please try again later.
        </Typography>

        {/* Action buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: GRID.LAYOUT_SPACING.element,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Button
            variant="contained"
            onClick={handleRetry}
            size="LARGE"
            ariaLabel="Retry current action"
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            onClick={handleGoHome}
            size="LARGE"
            ariaLabel="Return to homepage"
          >
            Go to Homepage
          </Button>
        </Box>

        {/* Error code */}
        <Typography
          variant="caption"
          sx={{
            ...THEME_CONSTANTS.TYPOGRAPHY.bodySmall,
            color: THEME_CONSTANTS.COLOR_TOKENS.outline,
            marginTop: GRID.LAYOUT_SPACING.section,
          }}
        >
          Error Code: 500
        </Typography>
      </Container>
    </AppLayout>
  );
};

export default ServerError500;