# Terraform variables for Task Management System infrastructure
# Version: hashicorp/terraform ~> 1.0

# Region Configuration
variable "aws_region" {
  type        = string
  description = "AWS region for infrastructure deployment"
  default     = "us-west-2"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.aws_region))
    error_message = "AWS region must be in valid format (e.g., us-west-2)"
  }
}

# Environment Configuration
variable "environment" {
  type        = string
  description = "Deployment environment (production/staging)"

  validation {
    condition     = contains(["production", "staging"], var.environment)
    error_message = "Environment must be either 'production' or 'staging'"
  }
}

# Network Configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR block must be in valid format"
  }
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for multi-AZ deployment"

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least two availability zones must be specified for high availability"
  }
}

# EKS Cluster Configuration
variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster"
  default     = "task-management-cluster"

  validation {
    condition     = length(var.cluster_name) <= 40
    error_message = "Cluster name must be 40 characters or less"
  }
}

variable "node_instance_type" {
  type        = string
  description = "EC2 instance type for EKS worker nodes"
  default     = "t3.large"

  validation {
    condition     = can(regex("^t3|t4g|m5|m6g|c5|c6g", var.node_instance_type))
    error_message = "Instance type must be a valid AWS instance type for EKS nodes"
  }
}

variable "min_nodes" {
  type        = number
  description = "Minimum number of nodes in the EKS cluster"
  default     = 3

  validation {
    condition     = var.min_nodes >= 3
    error_message = "Minimum number of nodes must be at least 3 for high availability"
  }
}

variable "max_nodes" {
  type        = number
  description = "Maximum number of nodes in the EKS cluster"
  default     = 10

  validation {
    condition     = var.max_nodes >= var.min_nodes
    error_message = "Maximum nodes must be greater than or equal to minimum nodes"
  }
}

# RDS Configuration
variable "db_instance_class" {
  type        = string
  description = "RDS instance class for PostgreSQL database"
  default     = "db.t3.large"

  validation {
    condition     = can(regex("^db\\.[t3|r5|m5]", var.db_instance_class))
    error_message = "DB instance class must be a valid RDS instance type"
  }
}

variable "db_allocated_storage" {
  type        = number
  description = "Allocated storage in GB for RDS instance"
  default     = 100

  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 16384
    error_message = "Allocated storage must be between 20GB and 16384GB"
  }
}

# Redis Configuration
variable "redis_node_type" {
  type        = string
  description = "ElastiCache node type for Redis cluster"
  default     = "cache.t3.medium"

  validation {
    condition     = can(regex("^cache\\.[t3|r5|m5]", var.redis_node_type))
    error_message = "Redis node type must be a valid ElastiCache instance type"
  }
}

variable "redis_num_cache_nodes" {
  type        = number
  description = "Number of cache nodes in the Redis cluster"
  default     = 2

  validation {
    condition     = var.redis_num_cache_nodes >= 2
    error_message = "At least two Redis nodes are required for high availability"
  }
}

# S3 Configuration
variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket for file storage"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "Bucket name must be a valid S3 bucket name"
  }
}