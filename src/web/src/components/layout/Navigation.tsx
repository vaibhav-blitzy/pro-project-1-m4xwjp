import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { useTheme, styled } from '@mui/material';
import Button from '../common/Button';
import Dropdown from '../common/Dropdown';
import { ROUTES } from '../../constants/route.constants';
import { useAuth } from '../../hooks/useAuth';
import { THEME_CONSTANTS, BREAKPOINTS, Z_INDEX } from '../../constants/app.constants';
import type { LoadingState } from '../../types/common.types';

// Styled components following Material Design 3
const NavigationContainer = styled('nav')(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: '64px',
  backgroundColor: THEME_CONSTANTS.COLOR_TOKENS.surface,
  boxShadow: THEME_CONSTANTS.ELEVATION.level2,
  zIndex: Z_INDEX.header,
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  transition: 'all 0.3s ease',
  
  [theme.breakpoints.down('sm')]: {
    padding: '0 8px',
  }
}));

const NavigationContent = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  maxWidth: BREAKPOINTS.lg,
  margin: '0 auto',
});

const NavigationBrand = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: THEME_CONSTANTS.TYPOGRAPHY.headlineLarge.fontSize,
  fontWeight: '500',
});

const NavigationLinks = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
  
  [theme.breakpoints.down('md')]: {
    display: 'none',
  }
}));

const MobileMenuButton = styled(Button)(({ theme }) => ({
  display: 'none',
  
  [theme.breakpoints.down('md')]: {
    display: 'flex',
  }
}));

const MobileMenu = styled('div')<{ isOpen: boolean }>(({ isOpen, theme }) => ({
  position: 'fixed',
  top: '64px',
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: THEME_CONSTANTS.COLOR_TOKENS.surface,
  transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 0.3s ease',
  zIndex: Z_INDEX.drawer,
  padding: '16px',
  overflowY: 'auto',
  
  [theme.breakpoints.up('md')]: {
    display: 'none',
  }
}));

// Types
interface NavigationProps {
  className?: string;
  isMobileMenuOpen: boolean;
  onMobileMenuToggle: (isOpen: boolean) => void;
  onNavigationError?: (error: Error) => void;
  breadcrumbItems?: BreadcrumbItem[];
  navigationHistory?: NavigationHistoryItem[];
}

interface NavigationItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
  children?: NavigationItem[];
  requiredRole?: string[];
  isProtected: boolean;
  loadingState: LoadingState;
}

const Navigation: React.FC<NavigationProps> = ({
  className,
  isMobileMenuOpen,
  onMobileMenuToggle,
  onNavigationError = (error: Error) => console.error(error),
  breadcrumbItems = [],
  navigationHistory = []
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Navigation items based on auth state
  const navigationItems: NavigationItem[] = [
    {
      path: ROUTES.DASHBOARD.BASE,
      label: 'Dashboard',
      isProtected: true,
      loadingState: 'IDLE'
    },
    {
      path: ROUTES.PROJECTS.BASE,
      label: 'Projects',
      isProtected: true,
      loadingState: 'IDLE'
    },
    {
      path: ROUTES.TASKS.BASE,
      label: 'Tasks',
      isProtected: true,
      loadingState: 'IDLE'
    },
    {
      path: ROUTES.SETTINGS.BASE,
      label: 'Settings',
      isProtected: true,
      loadingState: 'IDLE'
    }
  ];

  // Handle navigation
  const handleNavigation = useCallback((path: string) => {
    try {
      navigate(path);
      onMobileMenuToggle(false);
    } catch (error) {
      onNavigationError(error instanceof Error ? error : new Error('Navigation failed'));
    }
  }, [navigate, onMobileMenuToggle, onNavigationError]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate(ROUTES.AUTH.LOGIN);
    } catch (error) {
      onNavigationError(error instanceof Error ? error : new Error('Logout failed'));
    }
  }, [logout, navigate, onNavigationError]);

  // Mobile swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => onMobileMenuToggle(true),
    onSwipedLeft: () => onMobileMenuToggle(false),
    trackMouse: true
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onMobileMenuToggle(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onMobileMenuToggle]);

  // Render navigation links
  const renderNavigationLinks = (items: NavigationItem[]) => {
    return items.map((item) => {
      if (!isAuthenticated && item.isProtected) return null;

      return (
        <Button
          key={item.path}
          variant="text"
          onClick={() => handleNavigation(item.path)}
          aria-current={location.pathname === item.path ? 'page' : undefined}
          className={location.pathname === item.path ? 'active' : ''}
        >
          {item.icon}
          {item.label}
        </Button>
      );
    });
  };

  return (
    <NavigationContainer
      ref={navRef}
      className={className}
      role="navigation"
      aria-label="Main navigation"
      {...swipeHandlers}
    >
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <NavigationContent>
        <NavigationBrand>
          <Button
            variant="text"
            onClick={() => handleNavigation(ROUTES.BASE)}
            aria-label="Go to home page"
          >
            Task Management System
          </Button>
        </NavigationBrand>

        <NavigationLinks>
          {renderNavigationLinks(navigationItems)}
        </NavigationLinks>

        {isAuthenticated ? (
          <Dropdown
            options={[
              { id: 'profile', label: 'Profile', value: ROUTES.SETTINGS.PROFILE },
              { id: 'logout', label: 'Logout', value: 'logout' }
            ]}
            onChange={(value) => {
              if (value === 'logout') {
                handleLogout();
              } else {
                handleNavigation(value as string);
              }
            }}
            aria-label="User menu"
          />
        ) : (
          <Button
            variant="contained"
            onClick={() => handleNavigation(ROUTES.AUTH.LOGIN)}
          >
            Sign In
          </Button>
        )}

        <MobileMenuButton
          variant="text"
          onClick={() => onMobileMenuToggle(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? 'Close' : 'Menu'}
        </MobileMenuButton>
      </NavigationContent>

      <MobileMenu
        id="mobile-menu"
        isOpen={isMobileMenuOpen}
        aria-hidden={!isMobileMenuOpen}
      >
        {renderNavigationLinks(navigationItems)}
      </MobileMenu>
    </NavigationContainer>
  );
};

export default Navigation;