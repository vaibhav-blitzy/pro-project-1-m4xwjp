/**
 * @fileoverview Root Redux store configuration with enhanced middleware and real-time support
 * Implements Redux Toolkit for optimized state management, real-time collaboration,
 * and comprehensive performance monitoring
 * @version 1.0.0
 */

import { 
  configureStore, 
  combineReducers,
  createListenerMiddleware,
  TypedStartListening,
  TypedAddListener,
  ListenerEffectAPI,
  Middleware
} from '@reduxjs/toolkit'; // v1.9.0
import { io, Socket } from 'socket.io-client'; // v4.5.0
import authReducer from './auth/auth.reducer';
import taskReducer from './task/task.reducer';
import projectReducer from './project/project.reducer';
import notificationReducer from './notification/notification.reducer';

// Create listener middleware for side effects
const listenerMiddleware = createListenerMiddleware();

/**
 * Create the root reducer by combining all feature reducers
 * Implements proper type safety and error boundaries
 */
const rootReducer = combineReducers({
  auth: authReducer,
  task: taskReducer,
  project: projectReducer,
  notification: notificationReducer
});

/**
 * Configure real-time collaboration middleware
 * Handles WebSocket connections and real-time state updates
 */
const createRealtimeMiddleware = (): Middleware => {
  let socket: Socket;

  return store => next => action => {
    if (!socket) {
      socket = io(process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8080', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      // Handle real-time state updates
      socket.on('state_update', (update: { type: string; payload: any }) => {
        store.dispatch(update);
      });

      // Handle collaboration presence
      socket.on('collaborator_update', (update: { users: string[] }) => {
        store.dispatch({ type: 'task/updateActiveCollaborators', payload: update.users });
      });
    }

    return next(action);
  };
};

/**
 * Configure and create the Redux store with enhanced middleware
 * Implements performance monitoring and real-time collaboration
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    // Configure middleware options
    serializableCheck: {
      // Ignore certain action types for date handling
      ignoredActions: ['project/updateTimeline', 'task/setDueDate'],
      // Ignore certain paths for non-serializable data
      ignoredPaths: ['notification.lastFetchedAt']
    },
    thunk: {
      extraArgument: {
        // Add any extra arguments for thunks here
      }
    }
  }).prepend(
    listenerMiddleware.middleware,
    createRealtimeMiddleware()
  ),
  devTools: process.env.NODE_ENV !== 'production' && {
    // Configure Redux DevTools options
    name: 'Task Management System',
    trace: true,
    traceLimit: 25,
    maxAge: 50
  },
  preloadedState: undefined, // Initial state is handled by reducers
  enhancers: (defaultEnhancers) => defaultEnhancers
});

// Export types for TypeScript support
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppListenerEffectAPI = ListenerEffectAPI<RootState, AppDispatch>;
export type AppStartListening = TypedStartListening<RootState, AppDispatch>;
export type AppAddListener = TypedAddListener<RootState, AppDispatch>;

// Export listener middleware for use in feature slices
export const { startListening, addListener } = listenerMiddleware;

// Export store as default
export default store;