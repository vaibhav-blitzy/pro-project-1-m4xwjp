/**
 * @fileoverview A reusable notification component that displays system notifications
 * Implements Material Design 3 principles and real-time updates with accessibility support
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'; // v18.2.0
import { Alert, Badge, IconButton, Popper, ClickAwayListener, Box, List, ListItem, Typography, Divider } from '@mui/material'; // v5.14.0
import { NotificationsOutlined, CheckCircleOutline } from '@mui/icons-material'; // v5.14.0
import { useDispatch, useSelector } from 'react-redux'; // v8.1.0
import { styled } from '@mui/material/styles'; // v5.14.0
import { useTranslation } from 'react-i18next'; // v12.0.0

import { NotificationType, NotificationStatus } from '../../store/notification/notification.types';
import { Toast } from './Toast';
import type { BaseProps } from '../../interfaces/common.interface';

// Styled components
const NotificationContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: theme.zIndex.appBar + 1,
}));

const NotificationPopper = styled(Popper)(({ theme }) => ({
  width: '400px',
  maxHeight: '500px',
  overflow: 'auto',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[8],
  '&:focus': {
    outline: 'none',
  },
}));

const NotificationHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const NotificationList = styled(List)({
  padding: 0,
});

// Interface definitions
interface NotificationProps extends BaseProps {
  maxNotifications?: number;
  autoHideDuration?: number;
}

interface NotificationGroup {
  date: string;
  notifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    status: NotificationStatus;
    referenceId: string;
    timestamp: Date;
  }>;
}

/**
 * Notification component for displaying system notifications with accessibility support
 */
export const Notification: React.FC<NotificationProps> = React.memo(({
  maxNotifications = 50,
  autoHideDuration = 5000,
  className,
  style,
  testId = 'notification-component',
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  
  // State management
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Redux selectors
  const notifications = useSelector((state: any) => state.notification.notifications);
  const unreadCount = useSelector((state: any) => state.notification.unreadCount);
  const isLoading = useSelector((state: any) => state.notification.loadingState === 'LOADING');

  // Group notifications by date
  const groupedNotifications = React.useMemo(() => {
    return notifications.reduce((groups: NotificationGroup[], notification: any) => {
      const date = new Date(notification.timestamp).toLocaleDateString();
      const group = groups.find(g => g.date === date);
      
      if (group) {
        group.notifications.push(notification);
      } else {
        groups.push({ date, notifications: [notification] });
      }
      
      return groups;
    }, []);
  }, [notifications]);

  // Handlers
  const handleNotificationClick = useCallback((
    notificationId: string,
    type: NotificationType,
    referenceId: string
  ) => {
    dispatch({ type: 'MARK_AS_READ_REQUEST', payload: { id: notificationId } });
    
    // Navigate based on notification type
    switch (type) {
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_UPDATED:
        window.location.href = `/tasks/${referenceId}`;
        break;
      case NotificationType.PROJECT_CREATED:
        window.location.href = `/projects/${referenceId}`;
        break;
      default:
        break;
    }
    
    setIsOpen(false);
  }, [dispatch]);

  const handleMarkAllAsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_AS_READ_REQUEST' });
    Toast.showToast({
      message: t('notifications.allMarkedAsRead'),
      severity: 'success',
      duration: autoHideDuration,
    });
  }, [dispatch, t, autoHideDuration]);

  const handleToggle = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setIsOpen(prev => !prev);
  }, []);

  const handleClickAway = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <NotificationContainer
      className={className}
      style={style}
      data-testid={testId}
      ref={notificationRef}
    >
      <IconButton
        aria-label={t('notifications.toggle')}
        onClick={handleToggle}
        color="inherit"
        size="large"
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsOutlined />
        </Badge>
      </IconButton>

      <NotificationPopper
        open={isOpen}
        anchorEl={anchorEl}
        placement="bottom-end"
        transition
        role="dialog"
        aria-label={t('notifications.list')}
      >
        <ClickAwayListener onClickAway={handleClickAway}>
          <Box>
            <NotificationHeader>
              <Typography variant="h6">{t('notifications.title')}</Typography>
              {unreadCount > 0 && (
                <IconButton
                  onClick={handleMarkAllAsRead}
                  aria-label={t('notifications.markAllRead')}
                  size="small"
                >
                  <CheckCircleOutline />
                </IconButton>
              )}
            </NotificationHeader>

            {isLoading ? (
              <Box p={2} display="flex" justifyContent="center">
                <Typography>{t('common.loading')}</Typography>
              </Box>
            ) : (
              <NotificationList>
                {groupedNotifications.map((group, index) => (
                  <React.Fragment key={group.date}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <Typography variant="overline" color="textSecondary">
                        {group.date}
                      </Typography>
                    </ListItem>
                    {group.notifications.slice(0, maxNotifications).map((notification) => (
                      <ListItem
                        key={notification.id}
                        button
                        onClick={() => handleNotificationClick(
                          notification.id,
                          notification.type,
                          notification.referenceId
                        )}
                        sx={{
                          backgroundColor: notification.status === NotificationStatus.PENDING
                            ? 'action.hover'
                            : 'transparent',
                        }}
                      >
                        <Alert
                          severity={
                            notification.type.includes('ERROR') ? 'error' :
                            notification.type.includes('WARNING') ? 'warning' :
                            'info'
                          }
                          sx={{ width: '100%' }}
                        >
                          <Typography variant="subtitle2">{notification.title}</Typography>
                          <Typography variant="body2">{notification.message}</Typography>
                        </Alert>
                      </ListItem>
                    ))}
                  </React.Fragment>
                ))}
              </NotificationList>
            )}
          </Box>
        </ClickAwayListener>
      </NotificationPopper>
    </NotificationContainer>
  );
});

Notification.displayName = 'Notification';

export default Notification;