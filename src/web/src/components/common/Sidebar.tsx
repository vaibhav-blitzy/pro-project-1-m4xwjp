/**
 * @fileoverview A responsive and accessible sidebar component implementing Material Design 3
 * Provides primary navigation, project hierarchy, and quick actions for the task management system
 * @version 1.0.0
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  IconButton,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as TaskIcon,
  Folder as ProjectIcon,
  Add as AddIcon,
  Star as StarIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/route.constants';
import ErrorBoundary from './ErrorBoundary';
import { BREAKPOINTS, GRID, Z_INDEX } from '../../constants/app.constants';

// Sidebar width constants based on design specs
const DRAWER_WIDTH = 320;
const MINI_DRAWER_WIDTH = 72;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  testId?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  children?: NavigationItem[];
}

/**
 * Sidebar component providing primary navigation and project hierarchy
 */
const Sidebar: React.FC<SidebarProps> = memo(({ 
  open, 
  onClose, 
  className,
  testId = 'sidebar'
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  
  // Responsive breakpoints
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Local state
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');

  // Navigation items with hierarchy
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: ROUTES.DASHBOARD.BASE
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <ProjectIcon />,
      path: ROUTES.PROJECTS.BASE,
      children: user?.projects?.map(project => ({
        id: `project-${project.id}`,
        label: project.name,
        icon: <FolderIcon />,
        path: `${ROUTES.PROJECTS.BASE}/${project.id}`
      }))
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <TaskIcon />,
      path: ROUTES.TASKS.BASE
    }
  ];

  // Handle item expansion toggle
  const handleExpand = useCallback((itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  // Handle navigation with mobile drawer close
  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  }, [navigate, isMobile, onClose]);

  // Update selected item based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const matchingItem = navigationItems.find(item => 
      currentPath.startsWith(item.path)
    );
    if (matchingItem) {
      setSelectedItem(matchingItem.id);
    }
  }, [location.pathname]);

  // Calculate drawer width based on viewport
  const drawerWidth = isMobile ? '100%' : isTablet ? MINI_DRAWER_WIDTH : DRAWER_WIDTH;

  // Render navigation items recursively
  const renderNavItems = (items: NavigationItem[], level = 0) => (
    <List component="nav" sx={{ pl: level * 2 }}>
      {items.map(item => (
        <React.Fragment key={item.id}>
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedItem === item.id}
              onClick={() => item.children 
                ? handleExpand(item.id)
                : handleNavigation(item.path)
              }
              sx={{
                minHeight: 48,
                px: 2.5,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main + '20'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                sx={{
                  opacity: isTablet && open ? 0 : 1,
                  display: isMobile && !open ? 'none' : 'block'
                }}
              />
              {item.children && (
                expandedItems.includes(item.id) ? <ExpandLess /> : <ExpandMore />
              )}
            </ListItemButton>
          </ListItem>
          {item.children && (
            <Collapse in={expandedItems.includes(item.id)} timeout="auto">
              {renderNavItems(item.children, level + 1)}
            </Collapse>
          )}
        </React.Fragment>
      ))}
    </List>
  );

  return (
    <ErrorBoundary>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        onClose={onClose}
        className={className}
        data-testid={testId}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: `1px solid ${theme.palette.divider}`,
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
            zIndex: Z_INDEX.drawer,
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: GRID.CONTAINER_PADDING,
            minHeight: 64
          }}
        >
          {(!isTablet || open) && (
            <Typography variant="h6" noWrap component="div">
              Navigation
            </Typography>
          )}
          <IconButton onClick={onClose} sx={{ ml: 1 }}>
            {theme.direction === 'ltr' ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        </Box>
        
        <Divider />

        {isLoading ? (
          <Box sx={{ p: 2 }}>
            <Typography>Loading...</Typography>
          </Box>
        ) : (
          <>
            {renderNavItems(navigationItems)}
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ p: 2 }}>
              <Tooltip title="Create New Task">
                <IconButton
                  color="primary"
                  onClick={() => handleNavigation(ROUTES.TASKS.CREATE)}
                  sx={{ width: '100%' }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}
      </Drawer>
    </ErrorBoundary>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;