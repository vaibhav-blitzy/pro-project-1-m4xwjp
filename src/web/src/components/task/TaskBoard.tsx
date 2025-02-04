/**
 * @fileoverview Enhanced Kanban-style TaskBoard component with drag-drop support,
 * real-time updates, and accessibility features following Material Design 3
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { styled, useTheme } from '@mui/material/styles'; // v5.14.0
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'; // v13.1.1
import { useDispatch, useSelector } from 'react-redux'; // v8.1.0
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0
import { useAnalytics } from '@analytics/react'; // v1.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11
import { useWebSocket } from 'react-use-websocket'; // v4.3.1

import { ITask, TaskStatus } from '../../interfaces/task.interface';
import { TaskCard } from './TaskCard';
import { selectFilteredTasks } from '../../store/task/task.selectors';

// Styled components with Material Design 3 specifications
const StyledTaskBoard = styled('div', {
  shouldForwardProp: (prop) => !['isRTL', 'isDragging'].includes(String(prop)),
})<{ isRTL: boolean; isDragging: boolean }>(({ theme, isRTL, isDragging }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  minHeight: '70vh',
  direction: isRTL ? 'rtl' : 'ltr',
  transition: theme.transitions.create('opacity', {
    duration: theme.transitions.duration.standard,
  }),
  opacity: isDragging ? 0.7 : 1,
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    overflowX: 'auto',
  },
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: '1fr',
  },
}));

const StyledColumn = styled('div', {
  shouldForwardProp: (prop) => !['isDragActive', 'isDropTarget'].includes(String(prop)),
})<{ isDragActive: boolean; isDropTarget: boolean }>(({ theme, isDragActive, isDropTarget }) => ({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  minHeight: '500px',
  border: `1px solid ${theme.palette.divider}`,
  '& > h3': {
    margin: 0,
    marginBottom: theme.spacing(2),
    color: theme.palette.text.primary,
    fontSize: theme.typography.h6.fontSize,
  },
  ...(isDragActive && {
    backgroundColor: theme.palette.action.hover,
  }),
  ...(isDropTarget && {
    borderColor: theme.palette.primary.main,
    boxShadow: theme.shadows[4],
  }),
}));

// Interface definitions
interface TaskBoardProps {
  projectId?: string;
  className?: string;
  virtualScrolling?: boolean;
  enableRealTimeUpdates?: boolean;
  onError?: (error: Error) => void;
  analyticsEnabled?: boolean;
}

interface TaskColumnProps {
  status: TaskStatus;
  tasks: ITask[];
  onDragEnd: (result: any) => void;
  virtualizer: any;
  isRTL: boolean;
  ariaLabel: string;
}

// Helper function to get column title
const getColumnTitle = (status: TaskStatus): string => {
  const titles = {
    [TaskStatus.TODO]: 'To Do',
    [TaskStatus.IN_PROGRESS]: 'In Progress',
    [TaskStatus.IN_REVIEW]: 'In Review',
    [TaskStatus.BLOCKED]: 'Blocked',
    [TaskStatus.COMPLETED]: 'Completed',
  };
  return titles[status] || status;
};

// TaskBoard component implementation
export const TaskBoard: React.FC<TaskBoardProps> = ({
  projectId,
  className,
  virtualScrolling = true,
  enableRealTimeUpdates = true,
  onError,
  analyticsEnabled = true,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const analytics = useAnalytics();
  const isRTL = theme.direction === 'rtl';
  const [isDragging, setIsDragging] = useState(false);

  // Redux state
  const tasks = useSelector(selectFilteredTasks);

  // WebSocket connection for real-time updates
  const { sendMessage } = useWebSocket(process.env.REACT_APP_WS_URL || '', {
    shouldReconnect: true,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    onError: (error) => onError?.(error),
  });

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    return tasks.reduce((acc, task) => {
      acc[task.status] = acc[task.status] || [];
      acc[task.status].push(task);
      return acc;
    }, {} as Record<TaskStatus, ITask[]>);
  }, [tasks]);

  // Virtual scrolling setup
  const columnVirtualizer = useVirtualizer({
    count: Object.values(TaskStatus).length,
    getScrollElement: () => document.querySelector('.task-board'),
    estimateSize: () => 500,
    overscan: 1,
  });

  // Drag and drop handler
  const handleDragEnd = useCallback(async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const newStatus = destination.droppableId as TaskStatus;

    setIsDragging(false);

    try {
      // Optimistic update
      dispatch({
        type: 'task/updateTaskStatus',
        payload: { taskId: draggableId, status: newStatus },
      });

      if (analyticsEnabled) {
        analytics.track('Task Status Changed', {
          taskId: draggableId,
          oldStatus: source.droppableId,
          newStatus,
          projectId,
        });
      }

      // Notify other users via WebSocket
      if (enableRealTimeUpdates) {
        sendMessage(JSON.stringify({
          type: 'TASK_STATUS_CHANGED',
          payload: { taskId: draggableId, status: newStatus },
        }));
      }
    } catch (error) {
      onError?.(error as Error);
      // Revert optimistic update
      dispatch({
        type: 'task/updateTaskStatus',
        payload: { taskId: draggableId, status: source.droppableId },
      });
    }
  }, [dispatch, projectId, analyticsEnabled, enableRealTimeUpdates, sendMessage, onError]);

  return (
    <ErrorBoundary
      fallback={<div>Error loading task board</div>}
      onError={onError}
    >
      <DragDropContext
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        <StyledTaskBoard
          className={`task-board ${className || ''}`}
          isRTL={isRTL}
          isDragging={isDragging}
          role="region"
          aria-label="Task Board"
        >
          {Object.values(TaskStatus).map((status) => (
            <Droppable key={status} droppableId={status}>
              {(provided, snapshot) => (
                <StyledColumn
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  isDragActive={snapshot.isDraggingOver}
                  isDropTarget={snapshot.isDraggingOver}
                  role="list"
                  aria-label={`${getColumnTitle(status)} tasks`}
                >
                  <h3>{getColumnTitle(status)}</h3>
                  {virtualScrolling ? (
                    <div style={{ height: `${columnVirtualizer.getTotalSize()}px` }}>
                      {(tasksByStatus[status] || []).map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{
                                ...dragProvided.draggableProps.style,
                                marginBottom: theme.spacing(2),
                              }}
                            >
                              <TaskCard
                                task={task}
                                draggable
                                loading={false}
                                expanded={dragSnapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                  ) : (
                    (tasksByStatus[status] || []).map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{
                              ...dragProvided.draggableProps.style,
                              marginBottom: theme.spacing(2),
                            }}
                          >
                            <TaskCard
                              task={task}
                              draggable
                              loading={false}
                              expanded={dragSnapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </StyledColumn>
              )}
            </Droppable>
          ))}
        </StyledTaskBoard>
      </DragDropContext>
    </ErrorBoundary>
  );
};

TaskBoard.displayName = 'TaskBoard';

export type { TaskBoardProps };