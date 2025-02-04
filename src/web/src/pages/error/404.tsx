import React, { useEffect } from 'react';
import { Box, Container, Typography, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppLayout from '../../components/layout/AppLayout';
import Button from '../../components/common/Button';
import * as ErrorTracker from '@sentry/browser';

/**
 * Enhanced 404 error page component with animations and error tracking
 */
const NotFoundPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Track 404 error occurrence
  useEffect(() => {
    ErrorTracker.captureEvent({
      message: '404 Page Not Found',
      level: 'warning',
      extra: {
        path: location.pathname,
        timestamp: new Date().toISOString(),
      },
    });
  }, [location.pathname]);

  // Animation variants for content
  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  // Handle navigation back to dashboard
  const handleNavigateHome = () => {
    ErrorTracker.addBreadcrumb({
      category: 'navigation',
      message: 'User navigated from 404 page to dashboard',
      level: 'info',
    });
    navigate('/dashboard');
  };

  return (
    <AppLayout>
      <Container
        component={motion.div}
        initial="hidden"
        animate="visible"
        variants={contentVariants}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 200px)',
          textAlign: 'center',
          gap: theme.spacing(4),
        }}
      >
        {/* Error Illustration */}
        <Box
          component={motion.div}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          sx={{
            width: '100%',
            maxWidth: '400px',
            height: 'auto',
            mb: 4,
          }}
        >
          <img
            src="/assets/images/404-illustration.svg"
            alt="Page not found illustration"
            style={{ width: '100%', height: 'auto' }}
          />
        </Box>

        {/* Error Message */}
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: {
              xs: theme.typography.h3.fontSize,
              md: theme.typography.h1.fontSize,
            },
            fontWeight: 700,
            color: theme.palette.error.main,
            mb: 2,
          }}
          role="alert"
        >
          404
        </Typography>

        {/* Error Description */}
        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontSize: {
              xs: theme.typography.h5.fontSize,
              md: theme.typography.h4.fontSize,
            },
            color: theme.palette.text.primary,
            mb: 3,
          }}
        >
          Page Not Found
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: theme.palette.text.secondary,
            maxWidth: '600px',
            mb: 4,
          }}
        >
          The page you're looking for doesn't exist or has been moved.
          Please check the URL or navigate back to the dashboard.
        </Typography>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: theme.spacing(2),
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Button
            variant="contained"
            size="LARGE"
            onClick={handleNavigateHome}
            aria-label="Return to dashboard"
          >
            Return to Dashboard
          </Button>

          <Button
            variant="outlined"
            size="LARGE"
            onClick={() => window.history.back()}
            aria-label="Go back to previous page"
          >
            Go Back
          </Button>
        </Box>
      </Container>
    </AppLayout>
  );
};

export default NotFoundPage;