# Output definitions for RDS module exposing database connection and monitoring details
# Terraform ~> 1.0

output "endpoint" {
  description = "RDS instance connection endpoint for application configuration"
  value       = aws_db_instance.this.endpoint
  sensitive   = false
}

output "address" {
  description = "RDS instance hostname for DNS configuration"
  value       = aws_db_instance.this.address
  sensitive   = false
}

output "port" {
  description = "RDS instance port number for connection configuration"
  value       = aws_db_instance.this.port
  sensitive   = false
}

output "database_name" {
  description = "Name of the default database for application configuration"
  value       = aws_db_instance.this.db_name
  sensitive   = false
}

output "master_username" {
  description = "Master username for database access - sensitive value requiring secure handling"
  value       = aws_db_instance.this.username
  sensitive   = true
}

output "arn" {
  description = "ARN of the RDS instance for IAM policy configuration"
  value       = aws_db_instance.this.arn
  sensitive   = false
}

output "security_group_id" {
  description = "ID of the RDS security group for network access control"
  value       = aws_security_group.this.id
  sensitive   = false
}

output "monitoring_role_arn" {
  description = "ARN of the IAM role used for enhanced RDS monitoring"
  value       = aws_db_instance.this.monitoring_role_arn
  sensitive   = false
}

output "performance_insights_endpoint" {
  description = "Endpoint for accessing RDS Performance Insights"
  value       = aws_db_instance.this.performance_insights_endpoint
  sensitive   = false
}

output "cloudwatch_log_groups" {
  description = "List of CloudWatch Log Groups for RDS instance logs"
  value       = aws_cloudwatch_log_group.this[*].name
  sensitive   = false
}