# PitchHub Dashboard - Terraform Infrastructure

Infrastructure-as-Code for deploying pitchhub-dashboard to Google Cloud Run with multi-project architecture.

## Quick Start

### Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- [Docker](https://docs.docker.com/get-docker/)
- Access to GCP Projects:
  - `ces2026-483021` (Cloud Run)
  - `ces2026-87861` (Firestore)

### Initial Setup

**1. Authenticate with GCP:**
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project ces2026-483021
```

**2. Configure Terraform:**
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your configuration
```

**3. Initialize Terraform:**
```bash
make dev-init
```

**4. Verify Secrets in Secret Manager:**
```bash
# List existing secrets (should show firebase-api-key and gemini-api-key)
make list-secrets

# View secret values if needed
make view-firebase-key
make view-gemini-key
```

**5. Deploy Infrastructure:**
```bash
make plan    # Review changes
make apply   # Apply infrastructure
```

**6. Deploy Application:**
```bash
make deploy-app
```

## Deployment Workflow

### Standard Deployment (Infrastructure + Application)

```bash
# 1. Plan infrastructure changes
make plan

# 2. Review and apply
make apply

# 3. Deploy application
make deploy-app
```

### Quick Commands

```bash
make deploy        # Plan + apply infrastructure
make deploy-app    # Build Docker image + deploy to Cloud Run
make output        # Show deployment URLs and info
make destroy       # Tear down infrastructure (CAUTION)
```

## Configuration

### Key Variables in terraform.tfvars

```hcl
cloud_run_project_id  = "ces2026-483021"  # Cloud Run project
firestore_project_id  = "ces2026-87861"   # Firestore project
service_name          = "pitchhub-dashboard"
pitch_event_project_id = "1001"  # Application event ID
region                = "us-central1"
```

### Resource Allocation

Adjust Cloud Run resources in `terraform.tfvars`:

```hcl
cloud_run_cpu    = "1"       # CPU units (1, 2, 4, 6, 8)
cloud_run_memory = "512Mi"   # Memory (128Mi to 32Gi)
max_instances    = "10"      # Max autoscale
min_instances    = "0"       # Min instances (0 = scale to zero)
```

## Architecture

### Multi-Project Setup

**Cloud Run Project (`ces2026-483021`):**
- Cloud Run service
- Secret Manager
- Service Account
- IAM bindings

**Firestore Project (`ces2026-87861`):**
- Firestore database `investorhub`
- Shared with ces2026-pitch
- Cross-project IAM for service account

### IAM Permissions

Service account `pitchhub-dashboard-sa@ces2026-483021.iam.gserviceaccount.com` has:

**In ces2026-483021:**
- `roles/secretmanager.secretAccessor` - Access secrets

**In ces2026-87861:**
- `roles/datastore.user` - Read/write Firestore

### Secrets

Two secrets stored in Secret Manager:

1. **`pitchhub-dashboard-firebase-config`** - Firebase configuration JSON
2. **`pitchhub-dashboard-gemini-api-key`** - Gemini API key (optional)

## Troubleshooting

### "terraform.tfvars not found"

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit with your values
```

### "Permission denied" errors

Ensure you have necessary IAM roles:

```bash
gcloud projects get-iam-policy ces2026-483021
gcloud projects get-iam-policy ces2026-87861
```

Required roles:
- `roles/editor` or `roles/owner` on both projects
- `roles/secretmanager.admin` on ces2026-483021

### "Secret not found" errors

Add secrets before deploying:

```bash
make add-firebase-config
make add-gemini-key
```

### Cloud Run deployment fails

Check service account permissions:

```bash
gcloud projects get-iam-policy ces2026-87861 \
  --flatten="bindings[].members" \
  --filter="bindings.members:pitchhub-dashboard-sa@ces2026-483021.iam.gserviceaccount.com"
```

## Common Commands

```bash
make help          # Show all available commands
make dev-init      # First-time setup
make plan          # Preview infrastructure changes
make apply         # Apply infrastructure changes
make deploy        # Plan + apply
make deploy-app    # Deploy application
make output        # Show outputs (URLs, etc.)
make logs          # View Cloud Run logs
make describe      # Describe Cloud Run service
make destroy       # Destroy infrastructure
make clean         # Clean temporary files
make info          # Show current configuration
```

## Documentation

- [TERRAFORM_GUIDE.md](./TERRAFORM_GUIDE.md) - Detailed Terraform guide (comprehensive)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Infrastructure architecture (detailed diagrams)

## Deployment Verification

After deployment, verify everything works:

```bash
# 1. Check Cloud Run service status
gcloud run services describe pitchhub-dashboard \
  --region=us-central1 \
  --project=ces2026-483021

# 2. Get service URL
make output

# 3. Test endpoint
curl $(terraform output -raw cloud_run_url)

# 4. View logs
make logs
```

## Security Notes

- Never commit `terraform.tfvars` to git (contains sensitive data)
- Use `terraform.tfvars.example` as template (safe to commit)
- Rotate secrets every 90 days
- Review IAM policies quarterly
- Monitor Secret Manager access logs
- Keep Terraform providers updated

## Estimated Costs

**Monthly Infrastructure Costs:**
- Cloud Run: ~$5-15 (depending on traffic)
- Secret Manager: ~$0.20
- GCR Storage: ~$0.10
- **Total: ~$5-25/month**

**Cost Optimization:**
- Service scales to zero when idle (no cost)
- Min instances = 0 (already configured)
- Right-sized resources (1 CPU, 512Mi memory)

## Support

For issues or questions:

1. Check logs: `make logs`
2. Review outputs: `make output`
3. Validate configuration: `make validate`
4. See [TERRAFORM_GUIDE.md](./TERRAFORM_GUIDE.md) for detailed troubleshooting

## Migration from Manual Setup

If you have existing resources in `myresume-457817`:

1. Deploy new infrastructure in `ces2026-483021`
2. Test thoroughly
3. Update DNS/URLs if applicable
4. Decommission old service:

```bash
gcloud run services delete investorhub-dashboard \
  --region=us-central1 \
  --project=myresume-457817
```

## Next Steps

After successful deployment:

1. ✓ Infrastructure deployed to ces2026-483021
2. ✓ Application accessible via HTTPS
3. ✓ Firestore connectivity verified
4. Update project documentation with new URLs
5. Train team on new deployment process
6. Set up monitoring and alerting (optional)
7. Configure backup strategy (optional)
