/**
 * @fileoverview Enhanced Material Design 3 Header component implementing responsive
 * top navigation bar with user profile, notifications, and navigation controls
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { AppBar, Toolbar, IconButton, Badge, Collapse } from '@mui/material'; // v5.14.0
import { NotificationsIcon, AccountCircle, Menu, DarkMode } from '@mui/icons-material'; // v5.14.0
import { styled } from '@mui/material/styles'; // v5.14.0
import { Avatar } from '../common/Avatar';
import { Dropdown } from '../common/Dropdown';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { GRID, THEME_CONSTANTS } from '../../constants/app.constants';

// Enhanced header props interface
interface HeaderProps {
  onMenuClick?: (event: React.MouseEvent) => void;
  isMobile?: boolean;
  isScrolled?: boolean;
  className?: string;
}

// Styled components following Material Design 3 specifications
const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => !['isScrolled', 'isMobile'].includes(prop as string),
})<{ isScrolled?: boolean; isMobile?: boolean }>(({ theme, isScrolled, isMobile }) => ({
  backgroundColor: theme.palette.background.default,
  boxShadow: isScrolled ? theme.shadows[4] : 'none',
  height: isMobile ? 56 : 64,
  transition: theme.transitions.create(['height', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  borderBottom: `1px solid ${theme.palette.divider}`,
  zIndex: theme.zIndex.appBar,
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  justifyContent: 'space-between',
  padding: theme.spacing(0, GRID.CONTAINER_PADDING / 8),
  minHeight: 'inherit',
  gap: theme.spacing(2),
}));

const ActionsContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

// Enhanced header component with Material Design 3 implementation
const Header: React.FC<HeaderProps> = React.memo(({ 
  onMenuClick,
  isMobile = false,
  isScrolled = false,
  className 
}) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Handle notification menu toggle
  const handleNotificationClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(notificationAnchor ? null : event.currentTarget);
  }, [notificationAnchor]);

  // Handle profile menu toggle
  const handleProfileClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchor(profileAnchor ? null : event.currentTarget);
  }, [profileAnchor]);

  // Handle notification item click
  const handleNotificationSelect = useCallback(async (id: string) => {
    await markAsRead(id);
    setNotificationAnchor(null);
  }, [markAsRead]);

  // Handle logout action
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setProfileAnchor(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout]);

  // Profile menu items
  const profileItems = [
    { id: 'profile', label: 'Profile', icon: <AccountCircle /> },
    { id: 'settings', label: 'Settings', icon: <DarkMode /> },
    { id: 'logout', label: 'Logout', icon: null }
  ];

  // Transform notifications for dropdown
  const notificationItems = notifications.map(notification => ({
    id: notification.id,
    label: notification.message,
    value: notification.id,
    icon: null,
    metadata: {
      timestamp: notification.createdAt,
      isRead: notification.status === 'READ'
    }
  }));

  return (
    <StyledAppBar 
      position="fixed" 
      color="default" 
      ref={headerRef}
      isScrolled={isScrolled}
      isMobile={isMobile}
      className={className}
      elevation={0}
    >
      <StyledToolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMenuClick}
          sx={{ display: { sm: 'none' } }}
        >
          <Menu />
        </IconButton>

        <ActionsContainer>
          <IconButton
            color="inherit"
            aria-label="notifications"
            onClick={handleNotificationClick}
            data-testid="notification-button"
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton
            edge="end"
            color="inherit"
            aria-label="account"
            onClick={handleProfileClick}
            data-testid="profile-button"
          >
            <Avatar
              src={user?.avatarUrl}
              alt={user?.name}
              size="small"
              fallback={user?.name?.[0] || 'U'}
              clickable
            />
          </IconButton>
        </ActionsContainer>

        <Collapse in={!!notificationAnchor}>
          <Dropdown
            options={notificationItems}
            value={[]}
            onChange={(_, option) => handleNotificationSelect(option.value)}
            multiSelect={false}
            searchable={true}
            virtualize={true}
            maxHeight={400}
            aria-label="Notifications dropdown"
          />
        </Collapse>

        <Collapse in={!!profileAnchor}>
          <Dropdown
            options={profileItems}
            value=""
            onChange={(_, option) => {
              if (option.id === 'logout') handleLogout();
              setProfileAnchor(null);
            }}
            multiSelect={false}
            maxHeight={300}
            aria-label="Profile dropdown"
          />
        </Collapse>
      </StyledToolbar>
    </StyledAppBar>
  );
});

Header.displayName = 'Header';

export default Header;