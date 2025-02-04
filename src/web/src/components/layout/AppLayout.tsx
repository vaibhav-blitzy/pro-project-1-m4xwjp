import React, { useState, useCallback, useEffect } from 'react';
import { Box, Container, useTheme, useMediaQuery, styled } from '@mui/material'; // v5.14.0
import { Header } from './Header';
import { Footer } from './Footer';
import Navigation from './Navigation';
import Sidebar from '../common/Sidebar';
import ErrorBoundary from '../common/ErrorBoundary';

// Styled components for layout structure
const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginLeft: 0,
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  backgroundColor: theme.palette.background.default,
  minHeight: '100vh',
  [theme.breakpoints.up('md')]: {
    marginLeft: '320px', // Full sidebar width
  },
}));

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  initialSidebarOpen?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  className,
  initialSidebarOpen = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isSidebarOpen, setSidebarOpen] = useState(initialSidebarOpen && !isMobile);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isMobile && !isSidebarOpen) {
        setSidebarOpen(true);
      }
      if (isMobile && isSidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, isSidebarOpen]);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Handle mobile menu toggle
  const handleMobileMenuToggle = useCallback((isOpen: boolean) => {
    setMobileMenuOpen(isOpen);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isMobileMenuOpen) {
          setMobileMenuOpen(false);
        }
        if (isMobile && isSidebarOpen) {
          setSidebarOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isMobile, isMobileMenuOpen, isSidebarOpen]);

  return (
    <ErrorBoundary>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
        className={className}
      >
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="skip-link"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            '&:focus': {
              position: 'fixed',
              top: theme.spacing(2),
              left: theme.spacing(2),
              width: 'auto',
              height: 'auto',
              padding: theme.spacing(2),
              backgroundColor: theme.palette.background.paper,
              zIndex: theme.zIndex.modal + 1,
            },
          }}
        >
          Skip to main content
        </a>

        {/* Header */}
        <Header
          onMenuClick={handleSidebarToggle}
          isMobile={isMobile}
        />

        {/* Navigation */}
        <Navigation
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={handleMobileMenuToggle}
        />

        {/* Sidebar */}
        <Sidebar
          open={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <MainContent
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{
            marginLeft: {
              xs: 0,
              md: isSidebarOpen ? '320px' : 0,
            },
            transition: theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          }}
        >
          <Container
            maxWidth="lg"
            sx={{
              pt: { xs: 8, sm: 9 }, // Account for fixed header
              pb: { xs: 8, sm: 9 }, // Account for footer
            }}
          >
            {children}
          </Container>
        </MainContent>

        {/* Footer */}
        <Footer />
      </Box>
    </ErrorBoundary>
  );
};

export default AppLayout;