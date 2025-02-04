# Terraform ~> 1.0

variable "environment" {
  description = "Environment name for resource naming and tagging (e.g., prod, staging, dev)"
  type        = string

  validation {
    condition     = can(regex("^(prod|staging|dev)$", var.environment))
    error_message = "Environment must be prod, staging, or dev"
  }
}

variable "vpc_id" {
  description = "ID of the VPC where Redis cluster will be deployed"
  type        = string

  validation {
    condition     = can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must be valid AWS VPC identifier"
  }
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for Redis cluster deployment across availability zones"
  type        = list(string)

  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least two private subnets required for high availability"
  }
}

variable "redis_node_type" {
  description = "Instance type for Redis nodes (minimum cache.r6g.2xlarge recommended for 256GB cluster)"
  type        = string
  default     = "cache.r6g.2xlarge"

  validation {
    condition     = can(regex("^cache\\.(r6g|r6gd|r5|r5d)\\.(xlarge|2xlarge|4xlarge|8xlarge|16xlarge)$", var.redis_node_type))
    error_message = "Node type must be a valid ElastiCache memory-optimized instance type"
  }
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster (minimum 3 recommended for HA)"
  type        = number
  default     = 3

  validation {
    condition     = var.redis_num_cache_nodes >= 2 && var.redis_num_cache_nodes <= 6
    error_message = "Number of cache nodes must be between 2 and 6 for optimal performance"
  }
}

variable "redis_port" {
  description = "Port number for Redis cluster (default: 6379)"
  type        = number
  default     = 6379

  validation {
    condition     = var.redis_port > 0 && var.redis_port < 65536
    error_message = "Port must be between 1 and 65535"
  }
}

variable "redis_parameter_group_family" {
  description = "Redis parameter group family (must be redis7.x for required features)"
  type        = string
  default     = "redis7.x"

  validation {
    condition     = can(regex("^redis7\\.x$", var.redis_parameter_group_family))
    error_message = "Parameter group family must be redis7.x for required features"
  }
}

variable "redis_maintenance_window" {
  description = "Weekly time range for maintenance operations (format: ddd:hh24:mi-ddd:hh24:mi)"
  type        = string
  default     = "sun:05:00-sun:06:00"

  validation {
    condition     = can(regex("^(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]-(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]$", var.redis_maintenance_window))
    error_message = "Maintenance window must be in format ddd:hh24:mi-ddd:hh24:mi"
  }
}

variable "tags" {
  description = "Additional tags for Redis resources (must include required tags per environment)"
  type        = map(string)
  default     = {}
}