# Provider and version requirements
# hashicorp/aws ~> 5.0
# hashicorp/terraform ~> 1.0
# terraform-aws-modules/vpc/aws ~> 5.0
# terraform-aws-modules/eks/aws ~> 19.0
# terraform-aws-modules/rds/aws ~> 6.0
# terraform-aws-modules/elasticache/aws ~> 3.0
# terraform-aws-modules/s3-bucket/aws ~> 3.0

terraform {
  required_version = "~> 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "task-management-terraform-state"
    key            = "terraform.tfstate"
    region         = var.aws_region
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
    kms_key_id     = var.kms_key_arn
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Environment        = var.environment
      Project           = "Task Management System"
      ManagedBy         = "Terraform"
      CostCenter        = var.cost_center
      DataClassification = var.data_classification
    }
  }
}

# VPC Configuration
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.environment}-task-management-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway     = true
  single_nat_gateway     = false
  enable_vpn_gateway     = true
  enable_dns_hostnames   = true
  enable_dns_support     = true

  tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

# EKS Cluster Configuration
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = var.cluster_name
  cluster_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true
  enable_irsa                    = true

  node_groups = {
    main = {
      instance_types = [var.node_instance_type]
      min_size      = var.min_nodes
      max_size      = var.max_nodes
      desired_size  = var.desired_nodes

      labels = {
        Environment = var.environment
      }
    }
  }
}

# RDS Database Configuration
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${var.environment}-task-management-db"

  engine               = "postgres"
  engine_version       = "14"
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  storage_encrypted    = true

  db_name  = "taskmanagement"
  username = var.db_username
  port     = "5432"

  multi_az               = true
  subnet_ids             = module.vpc.private_subnets
  vpc_security_group_ids = [aws_security_group.rds.id]

  maintenance_window      = "Mon:00:00-Mon:03:00"
  backup_window          = "03:00-06:00"
  backup_retention_period = 7

  deletion_protection = true
}

# ElastiCache Redis Configuration
module "elasticache" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 3.0"

  cluster_id           = "${var.environment}-task-management-redis"
  engine              = "redis"
  engine_version      = "7.0"
  node_type           = var.redis_node_type
  num_cache_nodes     = 2
  port                = 6379

  subnet_ids             = module.vpc.private_subnets
  vpc_security_group_ids = [aws_security_group.redis.id]

  automatic_failover_enabled = true
  multi_az_enabled          = true

  maintenance_window = "tue:05:00-tue:09:00"
}

# S3 Bucket Configuration
module "s3" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 3.0"

  bucket = "${var.environment}-task-management-storage"
  acl    = "private"

  versioning = {
    enabled = true
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }

  lifecycle_rule = [
    {
      id      = "archive"
      enabled = true

      transition = [
        {
          days          = 90
          storage_class = "STANDARD_IA"
        },
        {
          days          = 180
          storage_class = "GLACIER"
        }
      ]
    }
  ]
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "${var.environment}-rds-sg"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }
}

# Security Group for Redis
resource "aws_security_group" "redis" {
  name_prefix = "${var.environment}-redis-sg"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }
}

# Outputs
output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "VPC identifier"
}

output "eks_cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "EKS cluster endpoint URL"
}

output "database_endpoint" {
  value       = module.rds.db_instance_endpoint
  description = "RDS database connection endpoint"
}

output "redis_endpoint" {
  value       = module.elasticache.redis_endpoint
  description = "ElastiCache Redis connection endpoint"
}