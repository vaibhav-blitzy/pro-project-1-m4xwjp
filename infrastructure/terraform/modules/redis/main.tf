# AWS Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  name_prefix = "${var.environment}-${var.project_name}"
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    Service     = "redis-cache"
  }
}

# Subnet group for Redis cluster placement
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${local.name_prefix}-redis-subnet-group"
  subnet_ids  = var.private_subnet_ids
  description = "Subnet group for Redis cluster in private subnets"
  tags        = local.common_tags
}

# Parameter group for Redis configuration
resource "aws_elasticache_parameter_group" "redis" {
  family      = "redis7.x"
  name        = "${local.name_prefix}-redis-params"
  description = "Custom parameters for Redis cluster"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"
  }

  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  tags = local.common_tags
}

# Security group for Redis cluster
resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis-sg"
  vpc_id      = var.vpc_id
  description = "Security group for Redis cluster"

  ingress {
    description = "Redis port access from internal VPC"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

# Redis replication group (cluster)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.name_prefix}-redis"
  description         = "Redis cluster for distributed caching"

  # Engine configuration
  engine         = "redis"
  engine_version = "7.0"
  node_type      = "cache.r6g.2xlarge"  # Sized for 256GB memory requirement

  # Cluster configuration
  num_cache_clusters         = 2
  port                      = 6379
  parameter_group_name      = aws_elasticache_parameter_group.redis.name
  subnet_group_name         = aws_elasticache_subnet_group.redis.name
  security_group_ids        = [aws_security_group.redis.id]
  automatic_failover_enabled = true
  multi_az_enabled          = true

  # Security configuration
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token                 = var.redis_auth_token

  # Maintenance configuration
  maintenance_window        = "sun:05:00-sun:09:00"
  snapshot_window          = "00:00-05:00"
  snapshot_retention_limit = 7
  apply_immediately        = false
  auto_minor_version_upgrade = true

  tags = local.common_tags
}

# Outputs for other modules to consume
output "redis_endpoint" {
  description = "Primary endpoint for Redis cluster connection"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Redis cluster port number"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_security_group_id" {
  description = "Security group ID for Redis cluster access"
  value       = aws_security_group.redis.id
}

# Required variables
variable "environment" {
  description = "Deployment environment (e.g., production, staging)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where Redis cluster will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for Redis cluster placement"
  type        = list(string)
}

variable "redis_auth_token" {
  description = "Authentication token for Redis cluster access"
  type        = string
  sensitive   = true
}