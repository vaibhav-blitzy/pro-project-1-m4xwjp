# Output definitions for the S3 storage module
# AWS Provider version: ~> 4.0

# The unique identifier of the S3 bucket
output "bucket_id" {
  description = "The ID of the created S3 bucket"
  value       = aws_s3_bucket.main.id
  
  # Sensitive is set to false as bucket ID is used for resource references
  # and does not contain sensitive information
  sensitive = false
}

# The Amazon Resource Name (ARN) of the S3 bucket
output "bucket_arn" {
  description = "The ARN of the created S3 bucket"
  value       = aws_s3_bucket.main.arn
  
  # ARN is required for IAM policy configuration and is not sensitive
  sensitive = false
}

# The name of the S3 bucket
output "bucket_name" {
  description = "The name of the created S3 bucket"
  value       = aws_s3_bucket.main.bucket
  
  # Bucket name is used for application configuration and is not sensitive
  sensitive = false
}