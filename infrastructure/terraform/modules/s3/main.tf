# AWS Provider version constraint
# hashicorp/aws v4.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Main S3 bucket resource for storing task management system files
resource "aws_s3_bucket" "main" {
  bucket = var.bucket_name

  # Resource tagging
  tags = {
    Environment = var.environment
    Terraform   = "true"
    Service     = "task-management"
    ManagedBy   = "terraform"
  }

  # Force destroy option is set to false for production safety
  force_destroy = false
}

# Enable versioning on the S3 bucket
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Disabled"
  }
}

# Configure server-side encryption using AES256
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Configure lifecycle rules for object management
resource "aws_s3_bucket_lifecycle_rule" "main" {
  bucket = aws_s3_bucket.main.id
  enabled = var.lifecycle_rule_enabled
  prefix  = ""

  # Transition objects to STANDARD_IA after 90 days
  transition {
    days          = 90
    storage_class = "STANDARD_IA"
  }

  # Expire noncurrent versions after specified days
  noncurrent_version_expiration {
    days = var.noncurrent_version_expiration_days
  }

  # Clean up incomplete multipart uploads after 7 days
  abort_incomplete_multipart_upload_days = 7
}

# Block all public access to the bucket
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable object ownership controls
resource "aws_s3_bucket_ownership_controls" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Configure CORS rules for web access
resource "aws_s3_bucket_cors_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"] # Should be restricted in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Enable bucket logging
resource "aws_s3_bucket_logging" "main" {
  bucket = aws_s3_bucket.main.id

  target_bucket = aws_s3_bucket.main.id
  target_prefix = "logs/"
}