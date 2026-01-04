# Infrastructure Architecture - PitchHub Dashboard

Detailed architecture documentation for pitchhub-dashboard GCP infrastructure.

## System Overview

PitchHub Dashboard is a React-based investment dashboard deployed on Google Cloud Run with a multi-project architecture for resource isolation and shared database access.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User's Browser                               │
│                  (React SPA Application)                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│               GCP Project: ces2026-483021                        │
│                   (Cloud Run Project)                            │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Cloud Run Service: pitchhub-dashboard                    │  │
│  │  ├─ Container: node:18-alpine + serve                     │  │
│  │  ├─ Port: 8080                                             │  │
│  │  ├─ Env: PROJECT_ID=1001                                   │  │
│  │  └─ Service Account: pitchhub-dashboard-sa                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Secret Manager                                            │  │
│  │  ├─ pitchhub-dashboard-firebase-config                    │  │
│  │  └─ pitchhub-dashboard-gemini-api-key                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Cross-project IAM
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│               GCP Project: ces2026-87861                         │
│                  (Firestore Project)                             │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Firestore Database: investorhub (default)                │  │
│  │  ├─ Collection: investments                                │  │
│  │  ├─ Collection: votes                                       │  │
│  │  └─ Shared with: ces2026-pitch, pitchhub-dashboard        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Cloud Run Service

**Configuration:**
- **Name:** pitchhub-dashboard
- **Project:** ces2026-483021
- **Region:** us-central1
- **Platform:** Managed (fully serverless)
- **Runtime:** Node.js 18 Alpine + serve
- **Port:** 8080 (Cloud Run default)
- **Concurrency:** 80 (default)
- **Timeout:** 300s (5 minutes)
- **CPU:** 1 vCPU
- **Memory:** 512 MiB
- **Autoscaling:** 0-10 instances (scale to zero)

**Container Specification:**
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
```

**Environment Variables:**
- `PROJECT_ID=1001` - Application-level pitch event identifier (The Startup World Cup Seattle Regional)
- `GEMINI_API_KEY` (optional) - From Secret Manager if enabled

**Access Control:**
- Public (unauthenticated) via `allUsers` invoker role
- HTTPS-only (enforced by Cloud Run)
- CORS configured in application

### 2. Service Account

**Identity:**
```
pitchhub-dashboard-sa@ces2026-483021.iam.gserviceaccount.com
```

**Purpose:**
- Runtime identity for Cloud Run service
- Secure access to Firestore in separate project
- Access to Secret Manager for credentials

**IAM Roles:**

**In ces2026-483021 (Cloud Run project):**
- `roles/secretmanager.secretAccessor` - Read secrets

**In ces2026-87861 (Firestore project):**
- `roles/datastore.user` - Read/write Firestore data

### 3. Secret Manager

**Secrets Stored:**

1. **`pitchhub-dashboard-firebase-config`**
   - **Type:** JSON
   - **Content:** Complete Firebase configuration
   - **Usage:** Frontend Firebase SDK initialization
   - **Replication:** Automatic (multi-region)
   - **Access:** Service account via secretAccessor role

2. **`pitchhub-dashboard-gemini-api-key`**
   - **Type:** String
   - **Content:** Gemini API key for AI features
   - **Usage:** Optional, for future AI features
   - **Replication:** Automatic (multi-region)
   - **Access:** Service account via secretAccessor role

**Security Features:**
- Encryption at rest (Google-managed keys)
- Encryption in transit (TLS 1.2+)
- Access logging via Cloud Audit Logs
- IAM-based access control
- Automatic secret rotation support

### 4. Firestore Database

**Configuration:**
- **Project:** ces2026-87861
- **Database:** investorhub (default)
- **Mode:** Native mode (not Datastore mode)
- **Location:** us-central1 (regional)

**Data Model:**

```
investorhub/
├── investments/
│   └── {investmentId}
│       ├── projectId: number (1001)
│       ├── companyName: string
│       ├── investorName: string
│       ├── scores: object
│       │   ├── "Product/Technology Innovation": number (1-10)
│       │   ├── "Team Strength and Execution": number (1-10)
│       │   ├── "Go-to-Market Strategy": number (1-10)
│       │   └── ... (10 categories total)
│       ├── investmentAmount: number
│       ├── confidenceLevel: number (1-10)
│       ├── customRationale: string
│       ├── rationaleTags: string[]
│       └── submissionTimestamp: timestamp
│
└── votes/
    └── {voteId}
        ├── projectId: number (1001)
        ├── companyName: string
        ├── voterName: string
        ├── voteType: string ("inspiring" | "most-inspiring")
        └── submittedAt: timestamp
```

**Indexes:**
- Auto-indexed on `projectId` (for filtering)
- Auto-indexed on `companyName` (for grouping)
- Composite index on `projectId + companyName` (for queries)

**Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write from authenticated service accounts
    match /investments/{document} {
      allow read, write: if request.auth != null;
    }
    match /votes/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Multi-Project Architecture

**Rationale for Separation:**

**Cloud Run Project (ces2026-483021):**
- **Purpose:** Application hosting and secrets
- **Benefits:**
  - Isolated billing
  - Independent resource quotas
  - Separate IAM policies
  - Easier cost tracking

**Firestore Project (ces2026-87861):**
- **Purpose:** Shared database for multiple services
- **Benefits:**
  - Centralized data storage
  - Shared across ces2026-pitch and pitchhub-dashboard
  - Single source of truth
  - Simplified data consistency

**Cross-Project Communication:**
- Service account in ces2026-483021 granted `datastore.user` role in ces2026-87861
- Firebase SDK uses service account credentials for authentication
- All requests authenticated via Google Cloud IAM

## Network Architecture

### Request Flow

1. **User Request → Cloud Run:**
   - User navigates to `https://pitchhub-dashboard-*.run.app`
   - Cloud Run load balancer terminates TLS
   - Request routed to available instance (cold start if needed)

2. **Container Startup (Cold Start):**
   - Cloud Run pulls Docker image from GCR
   - Starts container with `serve -s dist -l 8080`
   - Container initialization ~5-10 seconds
   - Subsequent requests: <100ms

3. **Static Asset Serving:**
   - `serve` serves React SPA from `/dist` folder
   - All routes return `index.html` (SPA routing)
   - Assets cached with appropriate headers

4. **Firebase SDK Initialization:**
   - Browser loads React app
   - `firebaseConfig.ts` initializes Firebase SDK
   - SDK authenticates to Firestore (ces2026-87861)
   - Client-side queries execute directly to Firestore

5. **Firestore Data Access:**
   - React app queries Firestore collections
   - Filter by `projectId: 1001`
   - Real-time listeners for live updates
   - Results rendered in dashboard components

### Network Security

**TLS/HTTPS:**
- Cloud Run enforces HTTPS (TLS 1.2+)
- Automatic certificate management
- HTTP → HTTPS redirect

**CORS:**
- Configured in React app
- Firestore CORS handled by Firebase SDK

**DDoS Protection:**
- Google Cloud Armor (optional, not currently enabled)
- Cloud Run built-in rate limiting

**Authentication:**
- Currently public (unauthenticated)
- Future: Firebase Authentication integration

## Deployment Pipeline

### Build Process

```
1. Source Code
   ├─ React TypeScript app
   ├─ Vite build system
   └─ Firebase SDK integration

2. Docker Build (Multi-stage)
   ├─ Stage 1: Builder
   │  ├─ npm ci (install dependencies)
   │  └─ npm run build (Vite production build)
   └─ Stage 2: Runtime
      ├─ Install serve
      └─ Copy /dist from builder

3. Docker Image
   ├─ Base: node:18-alpine (~150MB)
   └─ Final size: ~200MB

4. Image Registry
   └─ GCR: gcr.io/ces2026-483021/pitchhub-dashboard:latest
```

### Deployment Workflow

```bash
# Manual deployment via deploy.sh
./deploy.sh
├─ 1. Build Docker image
├─ 2. Push to GCR
├─ 3. Deploy to Cloud Run
│     ├─ Update service with new image
│     ├─ Apply environment variables
│     ├─ Configure resources (CPU, memory)
│     └─ Set autoscaling parameters
└─ 4. Validate deployment
```

**No CI/CD Triggers:**
- Manual deployment only (as requested)
- No Cloud Build GitHub triggers
- No automatic deployments on git push

## Disaster Recovery

### Backup Strategy

**Firestore Backups:**
- Managed by ces2026-87861 project
- Daily automated backups (recommended)
- Point-in-time recovery available

**Terraform State:**
- Local state file: `terraform.tfstate`
- **Recommendation:** Move to GCS backend for teams

**Docker Images:**
- Stored in GCR with retention policy
- **Recommendation:** Tag releases (e.g., `v1.0.0`)

**Secrets:**
- Backed up in Secret Manager (versioned)
- Manual export recommended for DR

### Recovery Procedures

**Complete Infrastructure Loss:**
```bash
# 1. Restore Terraform state (if using GCS backend)
terraform init

# 2. Re-apply infrastructure
terraform apply

# 3. Restore secrets
make add-firebase-config
make add-gemini-key

# 4. Redeploy application
./deploy.sh
```

**Firestore Data Loss:**
- Restore from automated Firestore backup
- Managed in ces2026-87861 project

**Service Degradation:**
- Cloud Run auto-scales to handle traffic
- Increase `max_instances` if needed
- Monitor via Cloud Monitoring

## Monitoring & Observability

### Cloud Run Metrics

**Automatically Collected:**
- Request count
- Request latency (p50, p95, p99)
- Container instance count
- CPU utilization
- Memory utilization
- Billable container time

**Accessing Metrics:**
```bash
# Cloud Console
https://console.cloud.google.com/run/detail/us-central1/pitchhub-dashboard

# gcloud CLI
gcloud run services describe pitchhub-dashboard \
  --region=us-central1 \
  --project=ces2026-483021
```

### Logging

**Log Types:**
- Container logs (stdout/stderr)
- Request logs (access logs)
- System logs (platform events)

**Viewing Logs:**
```bash
# Stream logs
make logs

# Query specific logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=pitchhub-dashboard" \
  --limit=100 \
  --project=ces2026-483021
```

### Alerting (Recommended)

**Key Alerts:**
1. Error rate > 5%
2. Latency p95 > 2s
3. Instance count at max (scaling limit)
4. Memory utilization > 90%

**Alert Configuration:**
```bash
# Cloud Monitoring console
https://console.cloud.google.com/monitoring/alerting
```

## Cost Optimization

### Current Costs (Estimated)

**Cloud Run:**
- $0.00002400 per vCPU-second
- $0.00000250 per GiB-second
- $0.40 per million requests
- **Estimate:** ~$5-20/month (depends on traffic)

**Secret Manager:**
- $0.06 per secret per month
- $0.03 per 10,000 access operations
- **Estimate:** ~$0.20/month

**Firestore:**
- Managed in ces2026-87861
- Cost shared across multiple services

**GCR Storage:**
- $0.026 per GiB-month
- **Estimate:** ~$0.10/month

**Total Estimated Cost:** ~$5-25/month

### Cost Reduction Strategies

1. **Scale to Zero:**
   - `min_instances = 0` (already configured)
   - No cost when idle

2. **Right-size Resources:**
   - Monitor actual usage
   - Reduce `cloud_run_memory` if <50% utilization

3. **Image Optimization:**
   - Use smaller base images
   - Minimize layer count
   - Remove unnecessary dependencies

4. **Traffic Optimization:**
   - Cache static assets
   - Minimize Firestore queries
   - Batch database operations

## Security Architecture

### Defense in Depth

**Layer 1: Network Security**
- HTTPS-only (TLS 1.2+)
- Cloud Run managed load balancer
- DDoS protection (Google infrastructure)

**Layer 2: Authentication & Authorization**
- Service account-based access (not user accounts)
- IAM roles with least privilege
- Cross-project IAM bindings

**Layer 3: Secret Management**
- Secrets in Secret Manager (not environment variables)
- Encrypted at rest and in transit
- Access logging and audit trails

**Layer 4: Application Security**
- Firebase Security Rules (Firestore)
- Input validation in React app
- CORS configured correctly

**Layer 5: Audit & Compliance**
- Cloud Audit Logs enabled
- Access logs for all services
- Security Command Center integration (optional)

### Compliance Considerations

**Data Residency:**
- Region: us-central1 (United States)
- Firestore: Regional (not multi-region)

**Data Protection:**
- No PII stored (investor/company data only)
- No credit card or financial data
- Public investment information

**Access Control:**
- Public dashboard (no authentication)
- Admin access via IAM roles

## Resource Naming Convention

```
{service}-{component}-{environment}

Examples:
- pitchhub-dashboard-sa (service account)
- pitchhub-dashboard-firebase-config (secret)
- pitchhub-dashboard (Cloud Run service)
```

## GCP APIs Used

```
run.googleapis.com                # Cloud Run
secretmanager.googleapis.com      # Secret Manager
iam.googleapis.com                # IAM
firestore.googleapis.com          # Firestore
artifactregistry.googleapis.com   # Artifact Registry (optional)
containerregistry.googleapis.com  # Container Registry (GCR)
```

## Terraform Resource Dependencies

```
google_project_service (APIs)
  ↓
google_service_account
  ↓
google_secret_manager_secret
  ↓
google_project_iam_member (both projects)
  ↓
google_cloud_run_service
  ↓
google_cloud_run_service_iam_member (public access)
```

## Performance Characteristics

### Latency Profile

**Cold Start:**
- Container initialization: 5-10 seconds
- Occurs when scaling from zero
- Mitigated by startup CPU boost

**Warm Request:**
- <100ms for static assets
- 200-500ms for Firestore queries
- 50-200ms for typical page load

**Autoscaling:**
- Scale-up: ~30 seconds to provision new instance
- Scale-down: 15 minutes idle before termination

### Throughput

**Concurrent Requests per Instance:**
- Default: 80 concurrent requests
- Can handle 100-200 req/s per instance

**Maximum Throughput:**
- With 10 instances: 1000-2000 req/s
- Adjustable via `max_instances`

## Comparison: GCR vs Artifact Registry

### Google Container Registry (GCR) - Current

**Pros:**
- Simple setup
- Integrated with Cloud Run
- Automatic cleanup policies

**Cons:**
- Being deprecated (migration to AR recommended)
- Limited features compared to AR

### Artifact Registry (Optional)

**Pros:**
- Next-generation registry
- Better security features
- Regional replication
- Container analysis
- Future-proof

**Cons:**
- Slightly more complex setup
- Requires explicit repository creation

**Migration Path:**
```hcl
# In terraform.tfvars
create_artifact_registry = true
initial_image_url = "us-central1-docker.pkg.dev/ces2026-483021/pitchhub-dashboard/pitchhub-dashboard:latest"
```

## Future Enhancements

### Recommended Improvements

1. **Custom Domain:**
   - Configure custom domain mapping
   - SSL certificate management

2. **Firebase Authentication:**
   - Add user authentication
   - Role-based access control

3. **CDN Integration:**
   - Cloud CDN for static assets
   - Improved global performance

4. **Monitoring Dashboard:**
   - Custom Cloud Monitoring dashboard
   - Real-time metrics visualization

5. **Automated Testing:**
   - CI/CD pipeline with Cloud Build
   - Automated deployment tests

6. **Backup Automation:**
   - Scheduled Firestore exports
   - Automated backup verification
