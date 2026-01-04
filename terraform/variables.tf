# ========================================
# PitchHub Dashboard - Terraform Variables
# ========================================
# Input variable definitions for configurable infrastructure parameters

# ========================================
# Project Configuration
# ========================================

variable "cloud_run_project_id" {
  description = "GCP project ID where Cloud Run service will be deployed"
  type        = string
  default     = "ces2026-483021"
}

variable "firestore_project_id" {
  description = "GCP project ID where Firestore database is hosted"
  type        = string
  default     = "ces2026-87861"
}

variable "region" {
  description = "GCP region for Cloud Run deployment"
  type        = string
  default     = "us-central1"
}

# ========================================
# Service Configuration
# ========================================

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
  default     = "pitchhub-dashboard"
}

variable "pitch_event_project_id" {
  description = "Application-level project ID for pitch event (not GCP project). This is used to filter investment data in Firestore. Example: 1001 = The Startup World Cup Seattle Regional"
  type        = string
  default     = "1001"
}

# ========================================
# Docker Image Configuration
# ========================================

variable "initial_image_url" {
  description = "Initial Docker image URL for Cloud Run service. This will be overridden by deploy.sh deployments. Uses Google's hello-world image as placeholder until first deployment."
  type        = string
  default     = "gcr.io/cloudrun/hello"
}

variable "create_artifact_registry" {
  description = "Whether to create Artifact Registry repository for Docker images. Set to false to use existing GCR."
  type        = bool
  default     = false
}

variable "artifact_registry_repository" {
  description = "Artifact Registry repository name (only used if create_artifact_registry = true)"
  type        = string
  default     = "pitchhub-dashboard"
}

# ========================================
# Cloud Run Resource Allocation
# ========================================

variable "cloud_run_cpu" {
  description = "CPU allocation for Cloud Run service. Valid values: 1, 2, 4, 6, 8"
  type        = string
  default     = "1"

  validation {
    condition     = contains(["1", "2", "4", "6", "8"], var.cloud_run_cpu)
    error_message = "CPU must be one of: 1, 2, 4, 6, 8"
  }
}

variable "cloud_run_memory" {
  description = "Memory allocation for Cloud Run service. Valid values: 128Mi, 256Mi, 512Mi, 1Gi, 2Gi, 4Gi, 8Gi, 16Gi, 32Gi"
  type        = string
  default     = "512Mi"

  validation {
    condition     = contains(["128Mi", "256Mi", "512Mi", "1Gi", "2Gi", "4Gi", "8Gi", "16Gi", "32Gi"], var.cloud_run_memory)
    error_message = "Memory must be one of: 128Mi, 256Mi, 512Mi, 1Gi, 2Gi, 4Gi, 8Gi, 16Gi, 32Gi"
  }
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances for autoscaling"
  type        = string
  default     = "10"
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances. Set to 0 to scale to zero when idle."
  type        = string
  default     = "0"
}

# ========================================
# Feature Flags
# ========================================

variable "enable_gemini_api_key" {
  description = "Enable GEMINI_API_KEY environment variable from Secret Manager. Set to true when Gemini AI features are needed."
  type        = bool
  default     = false
}

# ========================================
# Note: Secrets Configuration
# ========================================
# This project uses existing secrets in Secret Manager:
# - firebase-api-key
# - gemini-api-key
#
# To view secrets: make list-secrets
# To update secrets: make update-firebase-key or make update-gemini-key
