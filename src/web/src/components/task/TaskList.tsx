/**
 * @fileoverview High-performance task list component with virtualization, filtering, and Material Design 3
 * Implements real-time updates, drag-drop reordering, and accessibility features
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo } from 'react'; // v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // v8.1.0
import { styled, useTheme } from '@mui/material/styles'; // v5.14.0
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'; // v13.1.1
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0

import { TaskCard } from './TaskCard';
import { ITask } from '../../interfaces/task.interface';
import { selectFilteredTasks } from '../../store/task/task.selectors';
import type { TaskSortField, SortDirection, TaskFilterCriteria } from '../../types/store.types';

/**
 * Props interface for TaskList component
 */
interface TaskListProps {
  /** Project identifier for filtering */
  projectId?: string;
  /** Task selection handler */
  onTaskSelect: (task: ITask) => void;
  /** Custom CSS class */
  className?: string;
  /** Field to sort by */
  sortBy?: TaskSortField;
  /** Sort direction */
  sortDirection?: SortDirection;
  /** Filter settings */
  filterCriteria?: TaskFilterCriteria;
  /** Virtualization config */
  virtualizeOptions?: {
    overscan: number;
    itemSize: number;
  };
}

/**
 * Styled container for task list with Material Design 3 specifications
 */
const StyledTaskList = styled('div', {
  shouldForwardProp: (prop) => !['isDraggingOver', 'isLoading'].includes(String(prop)),
})<{
  isDraggingOver: boolean;
  isLoading: boolean;
}>(({ theme, isDraggingOver, isLoading }) => ({
  height: '100%',
  overflowY: 'auto',
  padding: theme.spacing(2),
  backgroundColor: isDraggingOver
    ? theme.palette.action.hover
    : theme.palette.background.default,
  transition: theme.transitions.create(['background-color'], {
    duration: theme.transitions.duration.short,
  }),
  opacity: isLoading ? 0.7 : 1,
  position: 'relative',
  '&:focus': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '-2px',
  },
}));

/**
 * Styled container for virtualized list items
 */
const VirtualListContainer = styled('div')({
  height: '100%',
  width: '100%',
  position: 'relative',
});

/**
 * High-performance task list component with virtualization and drag-drop support
 */
export const TaskList: React.FC<TaskListProps> = ({
  projectId,
  onTaskSelect,
  className,
  sortBy = 'dueDate',
  sortDirection = 'asc',
  filterCriteria,
  virtualizeOptions = { overscan: 5, itemSize: 80 },
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const tasks = useSelector(selectFilteredTasks);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Configure virtualization
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => virtualizeOptions.itemSize,
    overscan: virtualizeOptions.overscan,
  });

  // Memoized sorted and filtered tasks
  const processedTasks = useMemo(() => {
    let filteredTasks = [...tasks];

    // Apply project filter
    if (projectId) {
      filteredTasks = filteredTasks.filter(task => task.projectId === projectId);
    }

    // Apply custom filters
    if (filterCriteria) {
      filteredTasks = filteredTasks.filter(task => {
        if (filterCriteria.priority && task.priority !== filterCriteria.priority) return false;
        if (filterCriteria.status && task.status !== filterCriteria.status) return false;
        if (filterCriteria.assigneeId && task.assigneeId !== filterCriteria.assigneeId) return false;
        return true;
      });
    }

    // Apply sorting
    return filteredTasks.sort((a, b) => {
      const modifier = sortDirection === 'asc' ? 1 : -1;
      return modifier * (a[sortBy] < b[sortBy] ? -1 : 1);
    });
  }, [tasks, projectId, filterCriteria, sortBy, sortDirection]);

  // Handle drag end for task reordering
  const handleDragEnd = useCallback(async (result: any) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    try {
      // Optimistically update the UI
      const newTasks = Array.from(processedTasks);
      const [removed] = newTasks.splice(sourceIndex, 1);
      newTasks.splice(destinationIndex, 0, removed);

      // Dispatch reorder action
      dispatch({
        type: 'task/reorderTasks',
        payload: {
          taskId: result.draggableId,
          sourceIndex,
          destinationIndex,
        },
      });
    } catch (error) {
      console.error('Failed to reorder task:', error);
      // Handle error and revert optimistic update if needed
    }
  }, [dispatch, processedTasks]);

  // Handle task status changes
  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    try {
      dispatch({
        type: 'task/updateTaskStatus',
        payload: {
          taskId,
          status: newStatus,
        },
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  }, [dispatch]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable
        droppableId="taskList"
        mode="virtual"
        renderClone={(provided, snapshot, rubric) => (
          <TaskCard
            task={processedTasks[rubric.source.index]}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            ref={provided.innerRef}
          />
        )}
      >
        {(provided, snapshot) => (
          <StyledTaskList
            ref={containerRef}
            className={className}
            isDraggingOver={snapshot.isDraggingOver}
            isLoading={false}
            {...provided.droppableProps}
          >
            <VirtualListContainer
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const task = processedTasks[virtualRow.index];
                return (
                  <Draggable
                    key={task.id}
                    draggableId={task.id}
                    index={virtualRow.index}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={{
                          ...dragProvided.draggableProps.style,
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: virtualizeOptions.itemSize,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <TaskCard
                          task={task}
                          onClick={() => onTaskSelect(task)}
                          onStatusChange={handleTaskStatusChange}
                          {...dragProvided.dragHandleProps}
                          draggable
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
            </VirtualListContainer>
            {provided.placeholder}
          </StyledTaskList>
        )}
      </Droppable>
    </DragDropContext>
  );
};

// Type export for external usage
export type { TaskListProps };