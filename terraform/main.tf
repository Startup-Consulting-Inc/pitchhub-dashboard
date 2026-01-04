# ========================================
# PitchHub Dashboard - Terraform Configuration
# ========================================
# Infrastructure-as-Code for deploying pitchhub-dashboard to Google Cloud Run
# with multi-project architecture (Cloud Run in ces2026-483021, Firestore in ces2026-87861)

terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# ========================================
# Provider Configuration
# ========================================

# Primary provider for Cloud Run project
provider "google" {
  project = var.cloud_run_project_id
  region  = var.region
}

# Secondary provider for Firestore project
provider "google" {
  alias   = "firestore"
  project = var.firestore_project_id
  region  = var.region
}

# ========================================
# Enable Required APIs
# ========================================

resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "artifactregistry.googleapis.com",
  ])

  project = var.cloud_run_project_id
  service = each.key

  disable_on_destroy = false
}

# ========================================
# Service Account - Use Existing Compute Service Account
# ========================================

# Reference existing compute service account
# Use full email address - compute service accounts are Google-managed
data "google_service_account" "compute" {
  account_id = "226295708852-compute@developer.gserviceaccount.com"
}

# ========================================
# IAM Bindings - Cloud Run Project
# ========================================

# Grant secret accessor role for Secret Manager access
resource "google_project_iam_member" "secret_accessor" {
  project = var.cloud_run_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${data.google_service_account.compute.email}"
}

# ========================================
# IAM Bindings - Firestore Project
# ========================================

# Grant Firestore access in separate project
resource "google_project_iam_member" "datastore_user" {
  provider = google.firestore
  project  = var.firestore_project_id
  role     = "roles/datastore.user"
  member   = "serviceAccount:${data.google_service_account.compute.email}"
}

# ========================================
# Secret Manager - Use Existing Secrets
# ========================================

# Reference existing Firebase API key secret
data "google_secret_manager_secret" "firebase_api_key" {
  project   = var.cloud_run_project_id
  secret_id = "firebase-api-key"
}

# Reference existing Gemini API key secret
data "google_secret_manager_secret" "gemini_api_key" {
  project   = var.cloud_run_project_id
  secret_id = "gemini-api-key"
}

# ========================================
# Artifact Registry (Optional)
# ========================================

resource "google_artifact_registry_repository" "pitchhub_dashboard" {
  count = var.create_artifact_registry ? 1 : 0

  project       = var.cloud_run_project_id
  location      = var.region
  repository_id = var.artifact_registry_repository
  format        = "DOCKER"
  description   = "Docker repository for pitchhub-dashboard"

  depends_on = [google_project_service.required_apis]
}

# ========================================
# Cloud Run Service
# ========================================

resource "google_cloud_run_service" "pitchhub_dashboard" {
  project  = var.cloud_run_project_id
  name     = var.service_name
  location = var.region

  template {
    spec {
      service_account_name = data.google_service_account.compute.email

      containers {
        image = var.initial_image_url

        ports {
          container_port = 8080
        }

        # Application-level project ID (pitch event identifier)
        env {
          name  = "PROJECT_ID"
          value = var.pitch_event_project_id
        }

        # Optional: GEMINI_API_KEY from Secret Manager
        dynamic "env" {
          for_each = var.enable_gemini_api_key ? [1] : []
          content {
            name = "GEMINI_API_KEY"
            value_from {
              secret_key_ref {
                name = data.google_secret_manager_secret.gemini_api_key.secret_id
                key  = "latest"
              }
            }
          }
        }

        resources {
          limits = {
            cpu    = var.cloud_run_cpu
            memory = var.cloud_run_memory
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"     = var.max_instances
        "autoscaling.knative.dev/minScale"     = var.min_instances
        "run.googleapis.com/startup-cpu-boost" = "true"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  # Allow image changes to be managed by Terraform (for production deployment)
  # but ignore client annotations (managed by gcloud)
  lifecycle {
    ignore_changes = [
      template[0].metadata[0].annotations["run.googleapis.com/client-name"],
      template[0].metadata[0].annotations["run.googleapis.com/client-version"],
    ]
  }

  depends_on = [
    google_project_service.required_apis,
    google_project_iam_member.secret_accessor,
    google_project_iam_member.datastore_user,
  ]
}

# ========================================
# Cloud Run IAM - Public Access
# ========================================

resource "google_cloud_run_service_iam_member" "public_access" {
  project  = var.cloud_run_project_id
  service  = google_cloud_run_service.pitchhub_dashboard.name
  location = google_cloud_run_service.pitchhub_dashboard.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
