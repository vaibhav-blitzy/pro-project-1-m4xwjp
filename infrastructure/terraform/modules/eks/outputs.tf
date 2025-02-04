# Core cluster information
output "cluster_endpoint" {
  description = "Endpoint URL for the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_name" {
  description = "Name of the EKS cluster for reference in other resources and configurations"
  value       = aws_eks_cluster.main.name
}

output "cluster_arn" {
  description = "Amazon Resource Name (ARN) of the EKS cluster"
  value       = aws_eks_cluster.main.arn
}

# Security-related outputs
output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required for cluster authentication"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "ID of the security group associated with the EKS cluster"
  value       = aws_security_group.cluster.id
}

output "cluster_primary_security_group_id" {
  description = "ID of the EKS-created security group applied to ENI"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

# Identity and access management
output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "cluster_role_arn" {
  description = "ARN of the IAM role associated with the EKS cluster"
  value       = aws_eks_cluster.main.role_arn
}

# Version information
output "cluster_version" {
  description = "Kubernetes version running on the EKS cluster"
  value       = aws_eks_cluster.main.version
}

# Node group information
output "node_group_role_arn" {
  description = "ARN of the IAM role used by the node group"
  value       = aws_iam_role.node_group.arn
}

output "node_security_group_id" {
  description = "ID of the security group associated with the EKS node group"
  value       = aws_security_group.node_group.id
}

# KMS encryption
output "cluster_encryption_key_arn" {
  description = "ARN of the KMS key used for encrypting Kubernetes secrets"
  value       = aws_kms_key.eks.arn
}

# Platform information
output "cluster_platform_version" {
  description = "Platform version of the EKS cluster"
  value       = aws_eks_cluster.main.platform_version
}

# Network configuration
output "cluster_vpc_config" {
  description = "VPC configuration details for the EKS cluster"
  value = {
    vpc_id             = var.vpc_id
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.cluster.id]
  }
}

# Status information
output "cluster_status" {
  description = "Current status of the EKS cluster"
  value       = aws_eks_cluster.main.status
}