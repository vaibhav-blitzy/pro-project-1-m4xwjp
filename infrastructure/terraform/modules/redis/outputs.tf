# Redis cluster endpoint output
output "redis_endpoint" {
  description = "Redis cluster endpoint URL for application connectivity"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

# Redis port output
output "redis_port" {
  description = "Redis cluster port number for connection configuration"
  value       = aws_elasticache_replication_group.redis.port
}

# Redis connection string output
output "redis_connection_string" {
  description = "Full Redis connection string in redis://<endpoint>:<port> format for direct application configuration"
  value       = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}"
}

# Redis security group ID output
output "redis_security_group_id" {
  description = "ID of the Redis security group for network access control"
  value       = aws_security_group.redis.id
}

# Redis reader endpoint output
output "redis_reader_endpoint" {
  description = "Reader endpoint for Redis cluster read operations"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

# Redis configuration endpoint output
output "redis_configuration_endpoint" {
  description = "Configuration endpoint for Redis cluster management"
  value       = aws_elasticache_replication_group.redis.configuration_endpoint_address
}

# Redis subnet group name output
output "redis_subnet_group_name" {
  description = "Name of the Redis subnet group for network configuration"
  value       = aws_elasticache_subnet_group.redis.name
}

# Redis parameter group name output
output "redis_parameter_group_name" {
  description = "Name of the Redis parameter group containing custom configurations"
  value       = aws_elasticache_parameter_group.redis.name
}

# Redis auth token ARN output
output "redis_auth_token_arn" {
  description = "ARN of the auth token secret used for Redis authentication"
  value       = aws_elasticache_replication_group.redis.auth_token
  sensitive   = true
}

# Redis maintenance window output
output "redis_maintenance_window" {
  description = "Maintenance window for Redis cluster updates"
  value       = aws_elasticache_replication_group.redis.maintenance_window
}