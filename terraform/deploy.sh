#!/bin/bash
set -e  # Exit on error

# ========================================
# PitchHub Dashboard Deployment Script
# ========================================
# This script automates the Docker build and Cloud Run deployment process
# Usage: ./deploy.sh [OPTIONS]

# ========================================
# Configuration
# ========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$SCRIPT_DIR"

# Default values (can be overridden by terraform.tfvars or command line)
CLOUD_RUN_PROJECT_ID="${CLOUD_RUN_PROJECT_ID:-ces2026-483021}"
SERVICE_NAME="${SERVICE_NAME:-pitchhub-dashboard}"
REGION="${REGION:-us-central1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# ========================================
# Color Output
# ========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# Command Line Arguments
# ========================================

SKIP_BUILD=false
SKIP_PUSH=false
SKIP_DEPLOY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-push)
      SKIP_PUSH=true
      shift
      ;;
    --skip-deploy)
      SKIP_DEPLOY=true
      shift
      ;;
    --tag)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --help)
      echo "PitchHub Dashboard Deployment Script"
      echo ""
      echo "Usage: ./deploy.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-build   Skip Docker image build step"
      echo "  --skip-push    Skip Docker image push to GCR"
      echo "  --skip-deploy  Skip Cloud Run deployment"
      echo "  --tag TAG      Use specific image tag (default: latest)"
      echo "  --help         Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./deploy.sh                    # Full deployment"
      echo "  ./deploy.sh --tag v1.0.0       # Deploy with specific tag"
      echo "  ./deploy.sh --skip-build       # Push existing image and deploy"
      exit 0
      ;;
    *)
      echo -e "${RED}[ERROR]${NC} Unknown option: $1"
      echo "Run ./deploy.sh --help for usage information"
      exit 1
      ;;
  esac
done

# ========================================
# Utility Functions
# ========================================

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
}

# ========================================
# Pre-flight Checks
# ========================================

check_prerequisites() {
  log_step "Checking Prerequisites"

  # Check gcloud
  if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI not found. Please install Google Cloud SDK."
    log_error "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
  fi
  log_info "✓ gcloud CLI found"

  # Check docker
  if ! command -v docker &> /dev/null; then
    log_error "Docker not found. Please install Docker."
    log_error "Visit: https://docs.docker.com/get-docker/"
    exit 1
  fi
  log_info "✓ Docker found"

  # Check terraform (optional)
  if ! command -v terraform &> /dev/null; then
    log_warn "Terraform not found. Will use default configuration values."
  else
    log_info "✓ Terraform found"
  fi

  # Check if project root exists
  if [ ! -d "$PROJECT_ROOT" ]; then
    log_error "Project root not found: $PROJECT_ROOT"
    exit 1
  fi
  log_info "✓ Project root found: $PROJECT_ROOT"

  # Check if Dockerfile exists
  if [ ! -f "$PROJECT_ROOT/Dockerfile" ]; then
    log_error "Dockerfile not found in: $PROJECT_ROOT"
    exit 1
  fi
  log_info "✓ Dockerfile found"

  log_info "All prerequisites OK"
}

# ========================================
# Load Terraform Outputs
# ========================================

load_terraform_outputs() {
    CONFIG_JSON=$(terraform -chdir="$TERRAFORM_DIR" output -json project_configuration 2>/dev/null)
    if [ -n "$CONFIG_JSON" ] && [ "$CONFIG_JSON" != "null" ]; then
      CLOUD_RUN_PROJECT_ID=$(echo "$CONFIG_JSON" | jq -r '.cloud_run_project' 2>/dev/null || echo "$CLOUD_RUN_PROJECT_ID")
      SERVICE_NAME=$(echo "$CONFIG_JSON" | jq -r '.service_name' 2>/dev/null || echo "$SERVICE_NAME")
      REGION=$(echo "$CONFIG_JSON" | jq -r '.region' 2>/dev/null || echo "$REGION")
      PITCH_EVENT_ID=$(echo "$CONFIG_JSON" | jq -r '.pitch_event_id' 2>/dev/null || echo "1001")
      log_info "Loaded configuration from Terraform state"
    else
      log_warn "Could not parse project_configuration from Terraform. Using defaults."
      # Fallback to individual outputs if map fails
      CLOUD_RUN_PROJECT_ID=$(terraform -chdir="$TERRAFORM_DIR" output -raw cloud_run_project 2>/dev/null || echo "$CLOUD_RUN_PROJECT_ID")
      SERVICE_NAME=$(terraform -chdir="$TERRAFORM_DIR" output -raw cloud_run_service_name 2>/dev/null || echo "$SERVICE_NAME")
      REGION=$(terraform -chdir="$TERRAFORM_DIR" output -raw cloud_run_region 2>/dev/null || echo "$REGION")
      PITCH_EVENT_ID="1001"
    fi

  log_info "  Project ID: $CLOUD_RUN_PROJECT_ID"
  log_info "  Event ID:   $PITCH_EVENT_ID"
  log_info "  Service:    $SERVICE_NAME"
  log_info "  Region:     $REGION"
  log_info "  Tag:        $IMAGE_TAG"
}

# ========================================
# Configure Docker Authentication
# ========================================

configure_docker_auth() {
  log_step "Configuring Docker Authentication"

  log_info "Configuring Docker for GCR..."
  gcloud auth configure-docker --quiet

  log_info "Docker authentication configured"
}

# ========================================
# Build Docker Image
# ========================================

build_docker_image() {
  if [ "$SKIP_BUILD" = true ]; then
    log_step "Skipping Docker Image Build"
    return
  fi

  IMAGE_URL="gcr.io/${CLOUD_RUN_PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}"

  log_step "Building Docker Image"
  log_info "Image: $IMAGE_URL"
  log_info "Context: $PROJECT_ROOT"
  log_info "Build Arg PROJECT_ID: $PITCH_EVENT_ID"

  docker build --platform linux/amd64 \
    --build-arg PROJECT_ID="$PITCH_EVENT_ID" \
    -t "$IMAGE_URL" "$PROJECT_ROOT"

  log_info "✓ Docker image built successfully"
}

# ========================================
# Push Docker Image
# ========================================

push_docker_image() {
  if [ "$SKIP_PUSH" = true ]; then
    log_step "Skipping Docker Image Push"
    return
  fi

  IMAGE_URL="gcr.io/${CLOUD_RUN_PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}"

  log_step "Pushing Docker Image to GCR"
  log_info "Image: $IMAGE_URL"

  docker push "$IMAGE_URL"

  log_info "✓ Docker image pushed successfully"
}

# ========================================
# Deploy to Cloud Run
# ========================================

deploy_to_cloud_run() {
  if [ "$SKIP_DEPLOY" = true ]; then
    log_step "Skipping Cloud Run Deployment"
    return
  fi

  IMAGE_URL="gcr.io/${CLOUD_RUN_PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}"

  log_step "Deploying to Cloud Run"
  log_info "Project: $CLOUD_RUN_PROJECT_ID"
  log_info "Service: $SERVICE_NAME"
  log_info "Region:  $REGION"
  log_info "Image:   $IMAGE_URL"

  gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_URL" \
    --region "$REGION" \
    --project "$CLOUD_RUN_PROJECT_ID" \
    --platform managed \
    --quiet

  log_info "✓ Cloud Run deployment completed"
}

# ========================================
# Show Service URL
# ========================================

show_service_url() {
  log_step "Deployment Summary"

  log_info "Fetching service URL..."

  SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region "$REGION" \
    --project "$CLOUD_RUN_PROJECT_ID" \
    --format='value(status.url)' 2>/dev/null || echo "")

  if [ -n "$SERVICE_URL" ]; then
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✓ Service deployed successfully!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${BLUE}Service URL:${NC} $SERVICE_URL"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Visit the URL above to test the application"
    echo "  2. Check logs: gcloud run services logs tail $SERVICE_NAME --project=$CLOUD_RUN_PROJECT_ID"
    echo "  3. View service: gcloud run services describe $SERVICE_NAME --region=$REGION --project=$CLOUD_RUN_PROJECT_ID"
  else
    log_warn "Could not retrieve service URL. Check deployment status manually."
  fi
}

# ========================================
# Main Execution
# ========================================

main() {
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}PitchHub Dashboard Deployment${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

  check_prerequisites
  load_terraform_outputs
  configure_docker_auth

  build_docker_image
  push_docker_image
  deploy_to_cloud_run

  show_service_url

  echo ""
  log_info "Deployment complete!"
}

# Run main function
main
