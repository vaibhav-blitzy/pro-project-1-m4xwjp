# Network Infrastructure Outputs
output "vpc_id" {
  description = "ID of the VPC with access logging enabled"
  value       = module.vpc.vpc_id
  sensitive   = false
}

output "private_subnet_ids" {
  description = "IDs of private subnets with security group associations"
  value       = module.vpc.private_subnets
  sensitive   = false
}

output "public_subnet_ids" {
  description = "IDs of public subnets with WAF integration"
  value       = module.vpc.public_subnets
  sensitive   = false
}

# EKS Cluster Outputs
output "eks_cluster_endpoint" {
  description = "Endpoint for EKS cluster with TLS encryption and access logging"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster for resource identification"
  value       = module.eks.cluster_name
  sensitive   = false
}

output "eks_security_group_id" {
  description = "Security group ID for EKS cluster with detailed access rules"
  value       = module.eks.cluster_security_group_id
  sensitive   = true
}

# Database Outputs
output "database_endpoint" {
  description = "Endpoint for RDS PostgreSQL instance with SSL encryption"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "database_instance_id" {
  description = "ID of RDS instance for monitoring and management"
  value       = module.rds.db_instance_id
  sensitive   = false
}

# Redis Cache Outputs
output "redis_endpoint" {
  description = "Endpoint for Redis cluster with encryption in-transit"
  value       = module.elasticache.redis_endpoint
  sensitive   = true
}

output "redis_port" {
  description = "Port for Redis cluster with security group access"
  value       = module.elasticache.redis_port
  sensitive   = false
}

# Storage Outputs
output "s3_bucket_id" {
  description = "ID of S3 bucket for file storage with versioning enabled"
  value       = module.s3.s3_bucket_id
  sensitive   = false
}

output "s3_bucket_arn" {
  description = "ARN of S3 bucket for IAM policy configuration"
  value       = module.s3.s3_bucket_arn
  sensitive   = false
}

# Additional Network Outputs
output "vpc_flow_logs_group" {
  description = "CloudWatch Log Group name for VPC flow logs monitoring"
  value       = module.vpc.vpc_flow_log_group
  sensitive   = false
}

output "vpc_availability_zones" {
  description = "List of availability zones used for high availability"
  value       = module.vpc.availability_zones
  sensitive   = false
}

# Security Outputs
output "eks_cluster_certificate_authority" {
  description = "Certificate authority data for EKS cluster authentication"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "database_monitoring_role_arn" {
  description = "ARN of the IAM role used for RDS enhanced monitoring"
  value       = module.rds.monitoring_role_arn
  sensitive   = false
}

# Performance Monitoring Outputs
output "database_performance_insights_endpoint" {
  description = "Endpoint for accessing RDS Performance Insights dashboard"
  value       = module.rds.performance_insights_endpoint
  sensitive   = false
}

output "redis_reader_endpoint" {
  description = "Reader endpoint for Redis cluster read operations"
  value       = module.elasticache.redis_reader_endpoint
  sensitive   = true
}

# Maintenance Outputs
output "redis_maintenance_window" {
  description = "Scheduled maintenance window for Redis cluster updates"
  value       = module.elasticache.redis_maintenance_window
  sensitive   = false
}