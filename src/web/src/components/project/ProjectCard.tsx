/**
 * @fileoverview Material Design 3 compliant Project Card component
 * Displays project information with comprehensive accessibility and i18n support
 * @version 1.0.0
 */

import React from 'react'; // v18.2.0
import { styled } from '@mui/material/styles'; // v5.14.0
import { Avatar, AvatarGroup, Tooltip } from '@mui/material'; // v5.14.0
import { useTranslation } from 'react-i18next'; // v13.0.0
import { Skeleton } from '@mui/material'; // v5.14.0

import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import ProgressBar from '../common/ProgressBar';
import { IProject, ProjectPriority } from '../../interfaces/project.interface';
import type { ComponentSize } from '../../types/common.types';

/**
 * Props interface for the ProjectCard component
 */
interface ProjectCardProps {
  project: IProject;
  onClick?: () => void;
  className?: string;
  isLoading?: boolean;
  size?: ComponentSize;
}

/**
 * Styled component for card content with responsive layout
 */
const StyledCardContent = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  direction: theme.direction, // RTL support

  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
}));

/**
 * Styled component for project info section
 */
const ProjectInfo = styled('div')(({ theme }) => ({
  flex: 1,
  minWidth: 0, // Prevent text overflow
}));

/**
 * Styled component for project metadata
 */
const ProjectMeta = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

/**
 * Styled component for project title
 */
const ProjectTitle = styled('h3')(({ theme }) => ({
  margin: 0,
  fontSize: theme.typography.h6.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
  color: theme.palette.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

/**
 * Styled component for project description
 */
const ProjectDescription = styled('p')(({ theme }) => ({
  margin: theme.spacing(1, 0),
  color: theme.palette.text.secondary,
  fontSize: theme.typography.body2.fontSize,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}));

/**
 * Maps project status to badge variant with accessibility support
 */
const getStatusVariant = (status: string): { variant: string; label: string } => {
  switch (status) {
    case 'ACTIVE':
      return { variant: 'success', label: 'Active Project' };
    case 'INACTIVE':
      return { variant: 'error', label: 'Inactive Project' };
    case 'PENDING':
      return { variant: 'warning', label: 'Pending Project' };
    case 'COMPLETED':
      return { variant: 'info', label: 'Completed Project' };
    default:
      return { variant: 'default', label: 'Unknown Status' };
  }
};

/**
 * Maps project priority to badge variant with accessibility support
 */
const getPriorityVariant = (priority: ProjectPriority): { variant: string; label: string } => {
  switch (priority) {
    case ProjectPriority.HIGH:
      return { variant: 'error', label: 'High Priority' };
    case ProjectPriority.MEDIUM:
      return { variant: 'warning', label: 'Medium Priority' };
    case ProjectPriority.LOW:
      return { variant: 'info', label: 'Low Priority' };
    default:
      return { variant: 'default', label: 'Unknown Priority' };
  }
};

/**
 * ProjectCard component implementing Material Design 3 specifications
 */
export const ProjectCard: React.FC<ProjectCardProps> = React.memo(({
  project,
  onClick,
  className,
  isLoading = false,
  size = 'MEDIUM',
}) => {
  const { t } = useTranslation();
  const status = getStatusVariant(project.status);
  const priority = getPriorityVariant(project.priority);

  if (isLoading) {
    return (
      <Card size={size} className={className}>
        <StyledCardContent>
          <Skeleton variant="rectangular" width="100%" height={120} />
        </StyledCardContent>
      </Card>
    );
  }

  return (
    <Card
      size={size}
      className={className}
      onClick={onClick}
      clickable={!!onClick}
      role="article"
      aria-label={t('project.card.aria.label', { name: project.name })}
    >
      <StyledCardContent>
        <ProjectInfo>
          <ProjectTitle>
            {project.name}
          </ProjectTitle>
          <ProjectDescription>
            {project.description}
          </ProjectDescription>
          <ProjectMeta>
            <Badge
              variant={status.variant as any}
              size="SMALL"
              aria-label={t('project.status.aria.label', { status: status.label })}
            >
              {t(`project.status.${project.status.toLowerCase()}`)}
            </Badge>
            <Badge
              variant={priority.variant as any}
              size="SMALL"
              aria-label={t('project.priority.aria.label', { priority: priority.label })}
            >
              {t(`project.priority.${project.priority.toLowerCase()}`)}
            </Badge>
          </ProjectMeta>
          <ProgressBar
            value={project.progress}
            max={100}
            size="SMALL"
            ariaLabel={t('project.progress.aria.label', { progress: project.progress })}
          />
        </ProjectInfo>
        <AvatarGroup
          max={4}
          sx={{ marginLeft: 'auto' }}
          aria-label={t('project.team.aria.label')}
        >
          {[project.owner, ...project.members].map((user) => (
            <Tooltip
              key={user.id}
              title={user.name}
              arrow
              placement="top"
            >
              <Avatar
                alt={user.name}
                src={user.avatarUrl || undefined}
                aria-label={t('project.member.aria.label', { name: user.name })}
              />
            </Tooltip>
          ))}
        </AvatarGroup>
      </StyledCardContent>
    </Card>
  );
});

ProjectCard.displayName = 'ProjectCard';

export type { ProjectCardProps };