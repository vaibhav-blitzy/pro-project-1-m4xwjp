# terraform ~> 1.0

variable "environment" {
  description = "Deployment environment identifier for resource tagging and isolation"
  type        = string

  validation {
    condition     = can(regex("^(production|staging|development)$", var.environment))
    error_message = "Environment must be one of: production, staging, development"
  }
}

variable "cidr_block" {
  description = "Primary CIDR block for the VPC network space"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", var.cidr_block))
    error_message = "CIDR block must be in valid IPv4 CIDR notation"
  }
}

variable "availability_zones" {
  description = "List of AWS availability zones for multi-AZ deployment"
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones must be specified for high availability"
  }
}

variable "private_subnets" {
  description = "List of CIDR blocks for private subnets, one per AZ for workload isolation"
  type        = list(string)

  validation {
    condition     = length(var.private_subnets) == length(var.availability_zones)
    error_message = "Number of private subnet CIDRs must match number of availability zones"
  }
}

variable "public_subnets" {
  description = "List of CIDR blocks for public subnets, one per AZ for load balancers and NAT gateways"
  type        = list(string)

  validation {
    condition     = length(var.public_subnets) == length(var.availability_zones)
    error_message = "Number of public subnet CIDRs must match number of availability zones"
  }
}

variable "enable_dns_hostnames" {
  description = "Flag to enable DNS hostnames in the VPC for internal service discovery"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Flag to enable DNS resolution support in the VPC for internal service discovery"
  type        = bool
  default     = true
}

variable "enable_nat_gateway" {
  description = "Flag to enable NAT Gateway deployment for private subnet internet access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Flag to use a single NAT Gateway for all private subnets (cost optimization for non-production)"
  type        = bool
  default     = false
}