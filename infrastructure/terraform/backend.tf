# Backend configuration for Task Management System Terraform state
# Version: hashicorp/terraform ~> 1.5

terraform {
  backend "s3" {
    # Primary state storage configuration
    bucket = "task-management-terraform-state"
    key    = "terraform.tfstate"
    region = var.aws_region

    # State locking configuration using DynamoDB
    dynamodb_table = "task-management-terraform-locks"

    # Security and encryption configuration
    encrypt        = true
    kms_key_id     = "arn:aws:kms:${var.aws_region}:${data.aws_caller_identity.current.account_id}:key/task-management-state"
    
    # Access control and permissions
    acl            = "private"

    # Workspace management for multiple environments
    workspace_key_prefix = "environments"

    # Versioning and lifecycle configuration
    versioning = true

    # Server-side encryption configuration
    server_side_encryption_configuration {
      rule {
        apply_server_side_encryption_by_default {
          sse_algorithm     = "aws:kms"
          kms_master_key_id = "task-management-state"
        }
      }
    }

    # Additional security configurations
    force_path_style           = false
    skip_credentials_validation = false
    skip_metadata_api_check    = false
    skip_region_validation     = false

    # Lifecycle rules for state management
    lifecycle_rule {
      enabled = true

      noncurrent_version_transition {
        days          = 30
        storage_class = "STANDARD_IA"
      }

      noncurrent_version_transition {
        days          = 60
        storage_class = "GLACIER"
      }

      noncurrent_version_expiration {
        days = 90
      }
    }

    # Cross-region replication configuration
    replication_configuration {
      role = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/terraform-state-replication"

      rules {
        id     = "task-management-state-replication"
        status = "Enabled"

        destination {
          bucket        = "arn:aws:s3:::task-management-terraform-state-replica"
          storage_class = "STANDARD_IA"
          
          replica_kms_key_id = "arn:aws:kms:us-west-2:${data.aws_caller_identity.current.account_id}:key/task-management-state-replica"
        }
      }
    }

    # Access logging configuration
    logging {
      target_bucket = "task-management-logs"
      target_prefix = "terraform-state-access/"
    }
  }
}