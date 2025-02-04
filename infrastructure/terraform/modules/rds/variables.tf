# RDS PostgreSQL module variables
# Version: hashicorp/terraform ~> 1.0

variable "identifier" {
  type        = string
  description = "Unique identifier for the RDS instance"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.identifier))
    error_message = "Identifier must start with a letter and only contain lowercase letters, numbers, and hyphens"
  }
}

variable "engine_version" {
  type        = string
  description = "PostgreSQL engine version"
  default     = "14.8"
  validation {
    condition     = can(regex("^14\\.[0-9]+$", var.engine_version))
    error_message = "Engine version must be PostgreSQL 14.x"
  }
}

variable "instance_class" {
  type        = string
  description = "RDS instance class for production workloads"
  default     = "db.r5.2xlarge"
  validation {
    condition     = can(regex("^db\\.(t3|r5|m5)\\.(large|xlarge|2xlarge|4xlarge)$", var.instance_class))
    error_message = "Instance class must be a valid RDS instance type suitable for production"
  }
}

variable "allocated_storage" {
  type        = number
  description = "Allocated storage size in GB"
  default     = 100
  validation {
    condition     = var.allocated_storage >= 20 && var.allocated_storage <= 16384
    error_message = "Allocated storage must be between 20GB and 16384GB"
  }
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum storage size in GB for autoscaling"
  default     = 1000
  validation {
    condition     = var.max_allocated_storage >= var.allocated_storage
    error_message = "Maximum allocated storage must be greater than or equal to allocated storage"
  }
}

variable "database_name" {
  type        = string
  description = "Name of the default database to create"
  default     = "taskmanagement"
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_name))
    error_message = "Database name must start with a letter and contain only alphanumeric characters and underscores"
  }
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability"
  default     = true
}

variable "backup_retention_period" {
  type        = number
  description = "Backup retention period in days"
  default     = 30
  validation {
    condition     = var.backup_retention_period >= 7 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 7 and 35 days"
  }
}

variable "backup_window" {
  type        = string
  description = "Daily time range for automated backups (UTC)"
  default     = "03:00-04:00"
  validation {
    condition     = can(regex("^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$", var.backup_window))
    error_message = "Backup window must be in format HH:MM-HH:MM in UTC"
  }
}

variable "maintenance_window" {
  type        = string
  description = "Weekly time range for maintenance (UTC)"
  default     = "Mon:04:00-Mon:05:00"
  validation {
    condition     = can(regex("^(Mon|Tue|Wed|Thu|Fri|Sat|Sun):[0-2][0-9]:[0-5][0-9]-(Mon|Tue|Wed|Thu|Fri|Sat|Sun):[0-2][0-9]:[0-5][0-9]$", var.maintenance_window))
    error_message = "Maintenance window must be in format ddd:HH:MM-ddd:HH:MM in UTC"
  }
}

variable "deletion_protection" {
  type        = bool
  description = "Enable deletion protection for production databases"
  default     = true
}

variable "performance_insights_enabled" {
  type        = bool
  description = "Enable Performance Insights for monitoring"
  default     = true
}

variable "monitoring_interval" {
  type        = number
  description = "Enhanced monitoring interval in seconds"
  default     = 60
  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be 0, 1, 5, 10, 15, 30, or 60 seconds"
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all RDS resources"
  default     = {}
}