# Terraform version constraint
terraform {
  required_version = "~> 1.0"
}

# Name of the S3 bucket to create
variable "bucket_name" {
  description = "Name of the S3 bucket to create"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.bucket_name))
    error_message = "Bucket name must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen"
  }
}

# Environment name for resource tagging
variable "environment" {
  description = "Environment name for resource tagging (e.g., production, staging)"
  type        = string

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development"
  }
}

# Enable versioning for the S3 bucket
variable "versioning_enabled" {
  description = "Enable versioning for the S3 bucket"
  type        = bool
  default     = true
}

# Enable lifecycle rules for managing object versions
variable "lifecycle_rule_enabled" {
  description = "Enable lifecycle rules for managing object versions"
  type        = bool
  default     = true
}

# Number of days after which noncurrent object versions will be deleted
variable "noncurrent_version_expiration_days" {
  description = "Number of days after which noncurrent object versions will be deleted"
  type        = number
  default     = 90

  validation {
    condition     = var.noncurrent_version_expiration_days >= 30
    error_message = "Noncurrent version expiration days must be at least 30"
  }
}