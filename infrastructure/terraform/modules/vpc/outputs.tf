# VPC Outputs
output "vpc_id" {
  description = "ID of the created VPC for referencing in other infrastructure components"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the created VPC for network planning and security group configuration"
  value       = aws_vpc.main.cidr_block
}

# Subnet Outputs
output "private_subnet_ids" {
  description = "List of private subnet IDs across availability zones for deploying internal resources"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs across availability zones for deploying internet-facing resources"
  value       = aws_subnet.public[*].id
}

output "private_subnet_cidrs" {
  description = "List of private subnet CIDR blocks for network planning and security group rules"
  value       = aws_subnet.private[*].cidr_block
}

output "public_subnet_cidrs" {
  description = "List of public subnet CIDR blocks for network planning and security group rules"
  value       = aws_subnet.public[*].cidr_block
}

# Gateway Outputs
output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs for high availability private subnet internet access"
  value       = aws_nat_gateway.main[*].id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway for public subnet internet access configuration"
  value       = aws_internet_gateway.main.id
}

# Additional Network Outputs
output "vpc_flow_log_group" {
  description = "Name of the CloudWatch Log Group containing VPC Flow Logs"
  value       = aws_cloudwatch_log_group.flow_log.name
}

output "vpc_flow_log_role_arn" {
  description = "ARN of the IAM role used for VPC Flow Logs"
  value       = aws_iam_role.flow_log.arn
}

output "route_table_ids" {
  description = "Map of route table IDs for network routing configuration"
  value = {
    public  = aws_route_table.public.id
    private = aws_route_table.private[*].id
  }
}

output "availability_zones" {
  description = "List of availability zones where network resources are deployed"
  value       = var.availability_zones
}