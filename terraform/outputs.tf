# ========================================
# PitchHub Dashboard - Terraform Outputs
# ========================================
# Export useful values for deployment automation and debugging

# ========================================
# Cloud Run Outputs
# ========================================

output "cloud_run_url" {
  description = "URL of deployed Cloud Run service"
  value       = google_cloud_run_service.pitchhub_dashboard.status[0].url
}

output "cloud_run_service_name" {
  description = "Name of Cloud Run service"
  value       = google_cloud_run_service.pitchhub_dashboard.name
}

output "cloud_run_region" {
  description = "Region where Cloud Run service is deployed"
  value       = google_cloud_run_service.pitchhub_dashboard.location
}

# ========================================
# Service Account Outputs
# ========================================

output "service_account_email" {
  description = "Service account email for Cloud Run (existing compute service account)"
  value       = data.google_service_account.compute.email
}

output "service_account_id" {
  description = "Service account unique ID"
  value       = data.google_service_account.compute.unique_id
}

# ========================================
# Secret Manager Outputs
# ========================================

output "secret_names" {
  description = "Names of existing secrets in Secret Manager"
  value = {
    firebase_api_key = data.google_secret_manager_secret.firebase_api_key.secret_id
    gemini_api_key   = data.google_secret_manager_secret.gemini_api_key.secret_id
  }
}

output "secret_full_names" {
  description = "Full resource names of secrets (for gcloud commands)"
  value = {
    firebase_api_key = data.google_secret_manager_secret.firebase_api_key.id
    gemini_api_key   = data.google_secret_manager_secret.gemini_api_key.id
  }
}

# ========================================
# Project Configuration Outputs
# ========================================

output "project_configuration" {
  description = "Multi-project configuration summary"
  value = {
    cloud_run_project = var.cloud_run_project_id
    firestore_project = var.firestore_project_id
    service_name      = var.service_name
    region            = var.region
    pitch_event_id    = var.pitch_event_project_id
  }
}

# ========================================
# Docker Image Outputs
# ========================================

output "docker_image_url_gcr" {
  description = "Docker image URL for Google Container Registry"
  value       = "gcr.io/${var.cloud_run_project_id}/${var.service_name}:latest"
}

output "docker_image_url_artifact_registry" {
  description = "Docker image URL for Artifact Registry (if enabled)"
  value       = var.create_artifact_registry ? "${var.region}-docker.pkg.dev/${var.cloud_run_project_id}/${var.artifact_registry_repository}/${var.service_name}:latest" : "N/A - Artifact Registry not enabled"
}

# ========================================
# IAM Outputs
# ========================================

output "iam_summary" {
  description = "Summary of IAM permissions granted"
  value = {
    service_account         = data.google_service_account.compute.email
    cloud_run_project_roles = [
      "roles/secretmanager.secretAccessor",
    ]
    firestore_project_roles = [
      "roles/datastore.user",
    ]
    public_access = "allUsers - roles/run.invoker"
  }
}

# ========================================
# Deployment Command Outputs
# ========================================

output "deployment_commands" {
  description = "Useful deployment commands for reference"
  value = {
    build_image      = "docker build -t gcr.io/${var.cloud_run_project_id}/${var.service_name}:latest ."
    push_image       = "docker push gcr.io/${var.cloud_run_project_id}/${var.service_name}:latest"
    deploy_cloud_run = "gcloud run deploy ${var.service_name} --image gcr.io/${var.cloud_run_project_id}/${var.service_name}:latest --region ${var.region} --project ${var.cloud_run_project_id}"
    view_logs        = "gcloud run services logs tail ${var.service_name} --region ${var.region} --project ${var.cloud_run_project_id}"
    describe_service = "gcloud run services describe ${var.service_name} --region ${var.region} --project ${var.cloud_run_project_id}"
  }
}

# ========================================
# Secret Management Command Outputs
# ========================================

output "secret_management_commands" {
  description = "Commands for managing existing secrets"
  value = {
    view_firebase_api_key = "gcloud secrets versions access latest --secret=${data.google_secret_manager_secret.firebase_api_key.secret_id} --project=${var.cloud_run_project_id}"
    view_gemini_key       = "gcloud secrets versions access latest --secret=${data.google_secret_manager_secret.gemini_api_key.secret_id} --project=${var.cloud_run_project_id}"
    list_secrets          = "gcloud secrets list --project=${var.cloud_run_project_id}"
    update_firebase_key   = "echo 'new-value' | gcloud secrets versions add ${data.google_secret_manager_secret.firebase_api_key.secret_id} --data-file=- --project=${var.cloud_run_project_id}"
    update_gemini_key     = "echo 'new-value' | gcloud secrets versions add ${data.google_secret_manager_secret.gemini_api_key.secret_id} --data-file=- --project=${var.cloud_run_project_id}"
  }
}
