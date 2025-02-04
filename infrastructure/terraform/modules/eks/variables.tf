# Core Terraform configuration
terraform {
  required_version = "~> 1.0"
}

# Cluster Configuration Variables
variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]{0,38}[a-zA-Z0-9]$", var.cluster_name)) && length(var.cluster_name) <= 40
    error_message = "Cluster name must be 40 characters or less, start with a letter, and contain only alphanumeric characters and hyphens"
  }
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.27"

  validation {
    condition     = can(regex("^1\\.(2[3-7])$", var.cluster_version))
    error_message = "Cluster version must be a valid EKS supported version (1.23-1.27)"
  }
}

# Networking Variables
variable "vpc_id" {
  description = "ID of the VPC where EKS cluster will be deployed"
  type        = string

  validation {
    condition     = can(regex("^vpc-[a-f0-9]{8,17}$", var.vpc_id))
    error_message = "VPC ID must be a valid vpc-* identifier"
  }
}

variable "subnet_ids" {
  description = "List of private subnet IDs for EKS node groups"
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs must be provided for high availability"
  }
}

# Node Group Configuration
variable "node_instance_type" {
  description = "EC2 instance type for worker nodes"
  type        = string
  default     = "t3.large"

  validation {
    condition     = can(regex("^[a-z][1-9][.][a-z0-9]+$", var.node_instance_type))
    error_message = "Instance type must be a valid AWS EC2 instance type"
  }
}

variable "min_nodes" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 3

  validation {
    condition     = var.min_nodes >= 3
    error_message = "Minimum number of nodes must be at least 3 for high availability"
  }
}

variable "max_nodes" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 10

  validation {
    condition     = var.max_nodes >= var.min_nodes
    error_message = "Maximum nodes must be greater than or equal to minimum nodes"
  }
}

variable "node_disk_size" {
  description = "Disk size in GB for worker nodes"
  type        = number
  default     = 50

  validation {
    condition     = var.node_disk_size >= 20 && var.node_disk_size <= 2000
    error_message = "Node disk size must be between 20 and 2000 GB"
  }
}

# Cluster Logging Configuration
variable "enable_cluster_logging" {
  description = "Enable EKS control plane logging"
  type        = bool
  default     = true
}

variable "cluster_log_types" {
  description = "List of control plane logging types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  validation {
    condition = alltrue([
      for log_type in var.cluster_log_types :
      contains(["api", "audit", "authenticator", "controllerManager", "scheduler"], log_type)
    ])
    error_message = "Invalid log type specified. Must be one of: api, audit, authenticator, controllerManager, scheduler"
  }
}

# Resource Tagging
variable "tags" {
  description = "Tags to apply to all resources created by this module"
  type        = map(string)
  default     = {}

  validation {
    condition     = length(var.tags) <= 50
    error_message = "Maximum of 50 tags can be specified"
  }
}

# Security Configuration
variable "enable_encryption" {
  description = "Enable envelope encryption of Kubernetes secrets using KMS"
  type        = bool
  default     = true
}

variable "endpoint_private_access" {
  description = "Enable private API server endpoint access"
  type        = bool
  default     = true
}

variable "endpoint_public_access" {
  description = "Enable public API server endpoint access"
  type        = bool
  default     = false
}

variable "public_access_cidrs" {
  description = "List of CIDR blocks that can access the public API server endpoint"
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for cidr in var.public_access_cidrs :
      can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", cidr))
    ])
    error_message = "Public access CIDRs must be valid IPv4 CIDR notation"
  }
}

# Node Group IAM Configuration
variable "node_iam_policies" {
  description = "List of IAM policy ARNs to attach to node group role"
  type        = list(string)
  default = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ]
}

# Add-ons Configuration
variable "enable_cluster_addons" {
  description = "Map of EKS add-ons to enable"
  type        = map(bool)
  default = {
    vpc_cni    = true
    coredns    = true
    kube_proxy = true
  }
}