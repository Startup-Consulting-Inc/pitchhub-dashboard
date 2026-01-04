# Terraform Guide - PitchHub Dashboard

Complete guide to managing PitchHub Dashboard infrastructure with Terraform.

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Resource Definitions](#resource-definitions)
4. [Variables](#variables)
5. [Outputs](#outputs)
6. [State Management](#state-management)
7. [Advanced Topics](#advanced-topics)

## Overview

This Terraform configuration manages the complete infrastructure for pitchhub-dashboard, including:

- Cloud Run service deployment
- Service account with cross-project permissions
- Secret Manager for credentials
- IAM bindings for Firestore access
- Optional Artifact Registry repository

### Multi-Project Architecture

**Cloud Run Project (`ces2026-483021`):**
- Hosts the Cloud Run service
- Contains Secret Manager secrets
- Manages service account

**Firestore Project (`ces2026-87861`):**
- Hosts shared Firestore database `investorhub`
- Used by multiple services (ces2026-pitch, pitchhub-dashboard)
- Filtered by application-level `projectId`

## File Structure

```
terraform/
├── main.tf                    # Core infrastructure resources
├── variables.tf               # Input variable definitions
├── outputs.tf                 # Output value exports
├── terraform.tfvars.example   # Configuration template
├── terraform.tfvars           # Actual config (gitignored)
├── .gitignore                 # Prevent committing sensitive files
├── deploy.sh                  # Application deployment script
├── Makefile                   # Task automation
├── README.md                  # Quick setup guide
├── TERRAFORM_GUIDE.md         # This file
└── ARCHITECTURE.md            # Infrastructure architecture
```

## Resource Definitions

### 1. Provider Configuration

Two Google Cloud providers for multi-project setup:

```hcl
provider "google" {
  project = var.cloud_run_project_id  # ces2026-483021
  region  = var.region
}

provider "google" {
  alias   = "firestore"
  project = var.firestore_project_id  # ces2026-87861
  region  = var.region
}
```

### 2. Service Account

Dedicated service account for Cloud Run:

```hcl
resource "google_service_account" "pitchhub_dashboard" {
  project      = var.cloud_run_project_id
  account_id   = "pitchhub-dashboard-sa"
  display_name = "PitchHub Dashboard Service Account"
}
```

**Email:** `pitchhub-dashboard-sa@ces2026-483021.iam.gserviceaccount.com`

### 3. IAM Bindings

**Cloud Run Project Permissions:**

```hcl
resource "google_project_iam_member" "secret_accessor" {
  project = var.cloud_run_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.pitchhub_dashboard.email}"
}
```

**Firestore Project Permissions:**

```hcl
resource "google_project_iam_member" "datastore_user" {
  provider = google.firestore
  project  = var.firestore_project_id
  role     = "roles/datastore.user"
  member   = "serviceAccount:${google_service_account.pitchhub_dashboard.email}"
}
```

### 4. Secret Manager

Two secrets for credentials:

```hcl
# Firebase configuration JSON
resource "google_secret_manager_secret" "firebase_config" {
  project   = var.cloud_run_project_id
  secret_id = "pitchhub-dashboard-firebase-config"

  replication {
    auto {}
  }
}

# Gemini API key
resource "google_secret_manager_secret" "gemini_api_key" {
  project   = var.cloud_run_project_id
  secret_id = "pitchhub-dashboard-gemini-api-key"

  replication {
    auto {}
  }
}
```

**Note:** Secret values must be added manually or via terraform.tfvars:

```bash
# Manual addition (recommended)
gcloud secrets versions add pitchhub-dashboard-firebase-config \
  --data-file=firebase-config.json \
  --project=ces2026-483021

# Or use Makefile helper
make add-firebase-config
```

### 5. Cloud Run Service

Main application deployment:

```hcl
resource "google_cloud_run_service" "pitchhub_dashboard" {
  project  = var.cloud_run_project_id
  name     = var.service_name
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.pitchhub_dashboard.email

      containers {
        image = var.initial_image_url

        ports {
          container_port = 8080
        }

        env {
          name  = "PROJECT_ID"
          value = var.pitch_event_project_id
        }

        resources {
          limits = {
            cpu    = var.cloud_run_cpu
            memory = var.cloud_run_memory
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image,
      template[0].metadata[0].annotations["run.googleapis.com/client-name"],
      template[0].metadata[0].annotations["run.googleapis.com/client-version"],
    ]
  }
}
```

**Important:** The `lifecycle.ignore_changes` block prevents Terraform from overwriting image updates made by `deploy.sh`.

### 6. Public Access

Allow unauthenticated access:

```hcl
resource "google_cloud_run_service_iam_member" "public_access" {
  project  = var.cloud_run_project_id
  service  = google_cloud_run_service.pitchhub_dashboard.name
  location = google_cloud_run_service.pitchhub_dashboard.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

### 7. API Enablement

Ensure required APIs are enabled:

```hcl
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
```

## Variables

### Required Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `cloud_run_project_id` | string | `"ces2026-483021"` | GCP project for Cloud Run |
| `firestore_project_id` | string | `"ces2026-87861"` | GCP project for Firestore |
| `region` | string | `"us-central1"` | GCP region |
| `service_name` | string | `"pitchhub-dashboard"` | Cloud Run service name |
| `pitch_event_project_id` | string | `"1001"` | Application event ID |

### Optional Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `initial_image_url` | string | `"gcr.io/ces2026-483021/pitchhub-dashboard:latest"` | Initial Docker image |
| `cloud_run_cpu` | string | `"1"` | CPU allocation |
| `cloud_run_memory` | string | `"512Mi"` | Memory allocation |
| `max_instances` | string | `"10"` | Max autoscale instances |
| `min_instances` | string | `"0"` | Min instances |
| `enable_gemini_api_key` | bool | `false` | Enable Gemini API key env var |
| `create_artifact_registry` | bool | `false` | Create Artifact Registry |

### Sensitive Variables

| Variable | Type | Description |
|----------|------|-------------|
| `firebase_config_json` | string | Firebase configuration JSON |
| `gemini_api_key_value` | string | Gemini API key |

## Outputs

### Available Outputs

```bash
# Show all outputs
terraform output

# Show specific output
terraform output cloud_run_url

# Show as JSON
terraform output -json
```

### Output Descriptions

| Output | Description |
|--------|-------------|
| `cloud_run_url` | Deployed service URL |
| `cloud_run_service_name` | Service name |
| `cloud_run_region` | Deployment region |
| `service_account_email` | Service account email |
| `secret_names` | Secret Manager secret IDs |
| `project_configuration` | Multi-project config summary |
| `docker_image_url_gcr` | GCR image URL |
| `iam_summary` | IAM permissions summary |
| `deployment_commands` | Useful gcloud/docker commands |
| `secret_management_commands` | Secret management commands |

## State Management

### Local State (Default)

State stored locally in `terraform.tfstate`:

- Simple for single-user workflows
- Not recommended for teams
- Must be backed up manually

**Important Files:**
```
.terraform/              # Provider plugins (gitignored)
terraform.tfstate        # Current state (gitignored)
terraform.tfstate.backup # Previous state (gitignored)
.terraform.lock.hcl      # Provider version lock
```

### Remote State (Recommended for Teams)

Configure GCS backend in `main.tf`:

```hcl
terraform {
  backend "gcs" {
    bucket  = "ces2026-terraform-state"
    prefix  = "pitchhub-dashboard"
  }
}
```

Initialize with backend:

```bash
terraform init -backend-config="bucket=ces2026-terraform-state"
```

**Benefits:**
- Team collaboration
- State locking (prevents concurrent modifications)
- State versioning
- Automatic backup

## Advanced Topics

### 1. Enabling Gemini API Key

Update `terraform.tfvars`:

```hcl
enable_gemini_api_key = true
```

Add secret:

```bash
echo "your-api-key" | gcloud secrets versions add pitchhub-dashboard-gemini-api-key \
  --data-file=- \
  --project=ces2026-483021
```

Apply changes:

```bash
terraform apply
```

### 2. Using Artifact Registry Instead of GCR

Update `terraform.tfvars`:

```hcl
create_artifact_registry = true
artifact_registry_repository = "pitchhub-dashboard"
initial_image_url = "us-central1-docker.pkg.dev/ces2026-483021/pitchhub-dashboard/pitchhub-dashboard:latest"
```

Configure Docker auth:

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

Apply changes:

```bash
terraform apply
```

### 3. Resource Scaling

Adjust in `terraform.tfvars`:

```hcl
# Light traffic
cloud_run_cpu    = "1"
cloud_run_memory = "256Mi"
max_instances    = "5"

# Heavy traffic
cloud_run_cpu    = "2"
cloud_run_memory = "1Gi"
max_instances    = "50"
```

Apply:

```bash
terraform apply
```

### 4. Multi-Environment Setup

Create separate `.tfvars` files:

```bash
terraform.tfvars.dev
terraform.tfvars.staging
terraform.tfvars.prod
```

Deploy to specific environment:

```bash
terraform plan -var-file=terraform.tfvars.dev
terraform apply -var-file=terraform.tfvars.dev
```

### 5. Disaster Recovery

**Backup state:**

```bash
cp terraform.tfstate terraform.tfstate.backup-$(date +%Y%m%d)
```

**Import existing resources:**

```bash
# If resource exists but not in state
terraform import google_cloud_run_service.pitchhub_dashboard \
  ces2026-483021/us-central1/pitchhub-dashboard
```

**Restore from backup:**

```bash
cp terraform.tfstate.backup-20260102 terraform.tfstate
terraform refresh
```

### 6. Troubleshooting

**View Terraform logs:**

```bash
export TF_LOG=DEBUG
terraform plan
```

**Refresh state:**

```bash
terraform refresh
```

**Show current state:**

```bash
terraform show
```

**List resources:**

```bash
terraform state list
```

**Inspect specific resource:**

```bash
terraform state show google_cloud_run_service.pitchhub_dashboard
```

**Taint resource (force recreate):**

```bash
terraform taint google_cloud_run_service.pitchhub_dashboard
terraform apply
```

**Unlock state (if locked):**

```bash
terraform force-unlock <LOCK_ID>
```

## Best Practices

1. **Never commit `terraform.tfvars`** - Contains sensitive data
2. **Always run `terraform plan`** before `apply`
3. **Use `lifecycle.ignore_changes`** for externally managed attributes
4. **Enable state locking** for team environments
5. **Tag resources** for cost tracking and organization
6. **Use variables** for all configurable values
7. **Document changes** in git commit messages
8. **Test in dev** before applying to production
9. **Review IAM permissions** quarterly
10. **Rotate secrets** every 90 days

## Security Considerations

1. **Least Privilege:** Service account has minimal required permissions
2. **Secret Management:** Credentials stored in Secret Manager, never in code
3. **Access Control:** Public access controlled via IAM bindings
4. **Audit Logging:** Enable Cloud Audit Logs for compliance
5. **Encryption:** Secrets encrypted at rest and in transit
6. **Network Security:** Cloud Run uses HTTPS by default
7. **Version Control:** Never commit sensitive files (.tfvars, .tfstate)

## Migration Guide

### From Manual Setup to Terraform

If you have existing resources:

1. **Inventory existing resources:**
   ```bash
   gcloud run services list --project=ces2026-483021
   gcloud iam service-accounts list --project=ces2026-483021
   ```

2. **Import into Terraform:**
   ```bash
   terraform import google_cloud_run_service.pitchhub_dashboard \
     ces2026-483021/us-central1/pitchhub-dashboard
   ```

3. **Verify state:**
   ```bash
   terraform plan  # Should show no changes if import successful
   ```

4. **Update to match Terraform config:**
   ```bash
   terraform apply
   ```

## Performance Optimization

### Cold Start Optimization

Enable startup CPU boost (already configured):

```hcl
metadata {
  annotations = {
    "run.googleapis.com/startup-cpu-boost" = "true"
  }
}
```

### Instance Management

**Scale to zero (cost optimization):**
```hcl
min_instances = "0"
```

**Always warm instance (performance):**
```hcl
min_instances = "1"
```

### Resource Right-Sizing

Monitor actual usage:

```bash
gcloud run services describe pitchhub-dashboard \
  --region=us-central1 \
  --project=ces2026-483021 \
  --format='value(status)'
```

Adjust based on metrics:
- CPU utilization target: 60-80%
- Memory utilization target: 70-85%

## Common Operations

### Update Application Image

```bash
# Build and push new image
docker build -t gcr.io/ces2026-483021/pitchhub-dashboard:latest .
docker push gcr.io/ces2026-483021/pitchhub-dashboard:latest

# Deploy to Cloud Run
gcloud run deploy pitchhub-dashboard \
  --image gcr.io/ces2026-483021/pitchhub-dashboard:latest \
  --region us-central1 \
  --project ces2026-483021

# Or use deploy.sh
cd terraform
./deploy.sh
```

### Rotate Secrets

```bash
# Add new secret version
echo "new-api-key" | gcloud secrets versions add pitchhub-dashboard-gemini-api-key \
  --data-file=- \
  --project=ces2026-483021

# Trigger redeployment to pick up new secret
gcloud run services update pitchhub-dashboard \
  --region us-central1 \
  --project ces2026-483021
```

### View Logs

```bash
# Real-time logs
make logs

# Historical logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=pitchhub-dashboard" \
  --limit=100 \
  --project=ces2026-483021
```

### Monitor Performance

```bash
# Service metrics
gcloud run services describe pitchhub-dashboard \
  --region=us-central1 \
  --project=ces2026-483021

# Cloud Console
https://console.cloud.google.com/run/detail/us-central1/pitchhub-dashboard
```

## References

- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [IAM Best Practices](https://cloud.google.com/iam/docs/best-practices)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
