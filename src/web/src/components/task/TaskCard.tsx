/**
 * @fileoverview Enhanced Task Card component implementing Material Design 3
 * Provides drag-drop support, loading states, and accessibility features
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'; // v18.2.0
import { styled, useTheme } from '@mui/material/styles'; // v5.14.0
import { format } from 'date-fns'; // v2.30.0
import { useIntersectionObserver } from '@react-hooks/intersection-observer'; // v1.0.0
import { Skeleton } from '@mui/material'; // v5.14.0

import { ITask, TaskPriority, TaskStatus } from '../../interfaces/task.interface';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

// Priority color mapping for visual indicators
const PRIORITY_CONFIG = {
  [TaskPriority.LOW]: { color: 'info', label: 'Low' },
  [TaskPriority.MEDIUM]: { color: 'warning', label: 'Medium' },
  [TaskPriority.HIGH]: { color: 'error', label: 'High' },
  [TaskPriority.URGENT]: { color: 'error', label: 'Urgent' }
} as const;

// Status configuration for visual representation
const STATUS_CONFIG = {
  [TaskStatus.TODO]: { color: 'default', label: 'To Do' },
  [TaskStatus.IN_PROGRESS]: { color: 'primary', label: 'In Progress' },
  [TaskStatus.IN_REVIEW]: { color: 'info', label: 'In Review' },
  [TaskStatus.BLOCKED]: { color: 'error', label: 'Blocked' },
  [TaskStatus.COMPLETED]: { color: 'success', label: 'Completed' }
} as const;

interface TaskCardProps {
  task: ITask;
  onClick?: (task: ITask) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onDragStart?: (e: React.DragEvent, task: ITask) => void;
  onDragEnd?: (e: React.DragEvent, task: ITask) => void;
  className?: string;
  draggable?: boolean;
  loading?: boolean;
  expanded?: boolean;
  showAttachments?: boolean;
}

// Styled components with Material Design 3 specifications
const StyledTaskCard = styled(Card, {
  shouldForwardProp: (prop) => 
    !['isDragging', 'expanded'].includes(String(prop)),
})<{
  isDragging?: boolean;
  expanded?: boolean;
}>(({ theme, isDragging, expanded }) => ({
  width: '100%',
  transition: theme.transitions.create(
    ['transform', 'box-shadow'],
    { duration: theme.transitions.duration.short }
  ),
  ...(isDragging && {
    transform: 'scale(1.02)',
    cursor: 'grabbing',
  }),
  ...(expanded && {
    height: 'auto',
    maxHeight: 'none',
  }),
}));

const TaskHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(1),
}));

const TaskTitle = styled('h3')(({ theme }) => ({
  margin: 0,
  fontSize: theme.typography.h6.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
  color: theme.palette.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
}));

const TaskMetadata = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

const TaskDescription = styled('p')(({ theme }) => ({
  margin: `${theme.spacing(1)} 0`,
  color: theme.palette.text.secondary,
  fontSize: theme.typography.body2.fontSize,
  lineHeight: 1.5,
}));

const AttachmentsList = styled('ul')(({ theme }) => ({
  margin: `${theme.spacing(1)} 0`,
  padding: 0,
  listStyle: 'none',
}));

// Custom hooks for task card functionality
const useTaskCardAnimation = (draggable?: boolean, isDragging?: boolean) => {
  return {
    transform: isDragging ? 'scale(1.02)' : 'none',
    cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
    transition: 'transform 0.2s ease',
  };
};

const useTaskCardInteractions = (props: TaskCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragTimeoutRef = useRef<number>();

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!props.draggable) return;
    
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify(props.task));
    e.dataTransfer.effectAllowed = 'move';
    
    props.onDragStart?.(e, props.task);
  }, [props.task, props.draggable, props.onDragStart]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (!props.draggable) return;
    
    window.clearTimeout(dragTimeoutRef.current);
    setIsDragging(false);
    props.onDragEnd?.(e, props.task);
  }, [props.task, props.draggable, props.onDragEnd]);

  return {
    isDragging,
    handleDragStart,
    handleDragEnd,
  };
};

export const TaskCard: React.FC<TaskCardProps> = React.memo(({
  task,
  onClick,
  onStatusChange,
  onDragStart,
  onDragEnd,
  className,
  draggable = false,
  loading = false,
  expanded = false,
  showAttachments = false,
}) => {
  const theme = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible] = useIntersectionObserver(cardRef, { threshold: 0.1 });
  
  const {
    isDragging,
    handleDragStart,
    handleDragEnd,
  } = useTaskCardInteractions({
    task,
    onDragStart,
    onDragEnd,
    draggable,
  });

  const animationStyles = useTaskCardAnimation(draggable, isDragging);

  if (loading) {
    return (
      <StyledTaskCard className={className}>
        <Skeleton variant="rectangular" height={24} width="60%" />
        <Skeleton variant="rectangular" height={20} width="100%" style={{ marginTop: 8 }} />
        <Skeleton variant="rectangular" height={32} width="40%" style={{ marginTop: 8 }} />
      </StyledTaskCard>
    );
  }

  return (
    <StyledTaskCard
      ref={cardRef}
      className={className}
      clickable={!draggable}
      onClick={() => onClick?.(task)}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      isDragging={isDragging}
      expanded={expanded}
      elevation={isDragging ? 8 : 1}
      style={animationStyles}
      role="article"
      aria-label={`Task: ${task.title}`}
    >
      <TaskHeader>
        <TaskTitle>{task.title}</TaskTitle>
        <Badge
          variant={PRIORITY_CONFIG[task.priority].color as any}
          size="SMALL"
          aria-label={`Priority: ${PRIORITY_CONFIG[task.priority].label}`}
        >
          {PRIORITY_CONFIG[task.priority].label}
        </Badge>
      </TaskHeader>

      {expanded && (
        <TaskDescription>{task.description}</TaskDescription>
      )}

      <TaskMetadata>
        <Badge
          variant={STATUS_CONFIG[task.status].color as any}
          size="SMALL"
          aria-label={`Status: ${STATUS_CONFIG[task.status].label}`}
        >
          {STATUS_CONFIG[task.status].label}
        </Badge>
        <span aria-label="Due date">
          {format(task.dueDate, 'MMM dd, yyyy')}
        </span>
      </TaskMetadata>

      {showAttachments && task.attachments.length > 0 && (
        <AttachmentsList aria-label="Attachments">
          {task.attachments.map((attachment) => (
            <li key={attachment.id}>
              {attachment.fileName}
            </li>
          ))}
        </AttachmentsList>
      )}
    </StyledTaskCard>
  );
});

TaskCard.displayName = 'TaskCard';

export type { TaskCardProps };