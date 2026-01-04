# ========================================
# PitchHub Dashboard Terraform Makefile
# ========================================
# Task automation for common Terraform operations
#
# Usage: make <target>
# Example: make dev-init

.PHONY: help dev-init init plan apply deploy destroy validate fmt clean output output-json add-firebase-config add-gemini-key deploy-app deploy-app-quick info show-urls

# ========================================
# Configuration
# ========================================

TERRAFORM := terraform
TERRAFORM_DIR := .
TFVARS_FILE := terraform.tfvars
TFPLAN_FILE := tfplan

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
BLUE := \033[0;34m
NC := \033[0m # No Color

# ========================================
# Default Target
# ========================================

.DEFAULT_GOAL := help

# ========================================
# Help Target
# ========================================

help: ## Show this help message
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(BLUE)PitchHub Dashboard Terraform Commands$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Quick Start:$(NC)"
	@echo "  1. make dev-init          # First-time setup"
	@echo "  2. make add-firebase-config  # Add secrets"
	@echo "  3. make deploy            # Deploy infrastructure"
	@echo "  4. make deploy-app        # Deploy application"
	@echo ""

# ========================================
# Initialization Targets
# ========================================

dev-init: ## Initialize Terraform (first-time setup with validation)
	@echo "$(GREEN)[1/4]$(NC) Checking terraform.tfvars..."
	@if [ ! -f "$(TFVARS_FILE)" ]; then \
		echo "$(YELLOW)WARN:$(NC) terraform.tfvars not found. Copying from example..."; \
		cp terraform.tfvars.example $(TFVARS_FILE); \
		echo "$(RED)ACTION REQUIRED:$(NC) Edit $(TFVARS_FILE) with your configuration"; \
		echo "Then run 'make dev-init' again"; \
		exit 1; \
	fi
	@echo "$(GREEN)[2/4]$(NC) Initializing Terraform..."
	@$(TERRAFORM) init
	@echo "$(GREEN)[3/4]$(NC) Validating configuration..."
	@$(TERRAFORM) validate
	@echo "$(GREEN)[4/4]$(NC) Formatting files..."
	@$(TERRAFORM) fmt
	@echo "$(GREEN)✓$(NC) Terraform initialized successfully"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Add secrets: make add-firebase-config && make add-gemini-key"
	@echo "  2. Plan infrastructure: make plan"
	@echo "  3. Deploy infrastructure: make apply"

init: ## Initialize Terraform (without validation)
	@$(TERRAFORM) init
	@echo "$(GREEN)✓$(NC) Initialized"

# ========================================
# Planning & Deployment Targets
# ========================================

validate: ## Validate Terraform configuration
	@$(TERRAFORM) validate
	@echo "$(GREEN)✓$(NC) Configuration is valid"

fmt: ## Format Terraform files
	@$(TERRAFORM) fmt -recursive
	@echo "$(GREEN)✓$(NC) Files formatted"

plan: ## Create Terraform execution plan
	@echo "$(GREEN)Creating execution plan...$(NC)"
	@$(TERRAFORM) plan -out=$(TFPLAN_FILE)
	@echo ""
	@echo "$(GREEN)✓$(NC) Plan saved to $(TFPLAN_FILE)"
	@echo "$(YELLOW)Review the plan above, then run:$(NC) make apply"

apply: ## Apply Terraform plan (must run 'make plan' first)
	@if [ ! -f "$(TFPLAN_FILE)" ]; then \
		echo "$(RED)ERROR:$(NC) No plan file found. Run 'make plan' first."; \
		exit 1; \
	fi
	@echo "$(GREEN)Applying Terraform plan...$(NC)"
	@$(TERRAFORM) apply $(TFPLAN_FILE)
	@rm -f $(TFPLAN_FILE)
	@echo "$(GREEN)✓$(NC) Infrastructure deployed successfully"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Add secrets: make add-firebase-config && make add-gemini-key"
	@echo "  2. Deploy application: make deploy-app"

deploy: plan apply ## Plan and apply in sequence

destroy: ## Destroy all Terraform-managed infrastructure
	@echo "$(RED)WARNING:$(NC) This will destroy all infrastructure!"
	@echo "$(RED)This action cannot be undone.$(NC)"
	@echo ""
	@echo "Type 'destroy' to confirm:"
	@read confirm; \
	if [ "$$confirm" != "destroy" ]; then \
		echo "$(YELLOW)Aborted.$(NC)"; \
		exit 1; \
	fi
	@$(TERRAFORM) destroy
	@echo "$(GREEN)✓$(NC) Infrastructure destroyed"

# ========================================
# Output Targets
# ========================================

output: ## Show Terraform outputs
	@$(TERRAFORM) output

output-json: ## Show Terraform outputs in JSON format
	@$(TERRAFORM) output -json

show-urls: ## Show deployed service URLs
	@echo "$(GREEN)Deployed Service URLs:$(NC)"
	@$(TERRAFORM) output cloud_run_url

# ========================================
# Secret Management Targets
# ========================================

list-secrets: ## List all secrets in Secret Manager
	@echo "$(GREEN)Secrets in Secret Manager:$(NC)"
	@gcloud secrets list --project=ces2026-483021

view-firebase-key: ## View Firebase API key (latest version)
	@echo "$(GREEN)Firebase API Key (latest version):$(NC)"
	@gcloud secrets versions access latest --secret=firebase-api-key --project=ces2026-483021

view-gemini-key: ## View Gemini API key (latest version)
	@echo "$(GREEN)Gemini API Key (latest version):$(NC)"
	@gcloud secrets versions access latest --secret=gemini-api-key --project=ces2026-483021

update-firebase-key: ## Update Firebase API key with new version
	@echo "$(GREEN)Updating Firebase API key...$(NC)"
	@echo "$(YELLOW)Enter new Firebase API key:$(NC) "
	@read -s api_key; \
	echo "$$api_key" | gcloud secrets versions add firebase-api-key \
		--data-file=- \
		--project=ces2026-483021
	@echo ""
	@echo "$(GREEN)✓$(NC) Firebase API key updated"

update-gemini-key: ## Update Gemini API key with new version
	@echo "$(GREEN)Updating Gemini API key...$(NC)"
	@echo "$(YELLOW)Enter new Gemini API key:$(NC) "
	@read -s api_key; \
	echo "$$api_key" | gcloud secrets versions add gemini-api-key \
		--data-file=- \
		--project=ces2026-483021
	@echo ""
	@echo "$(GREEN)✓$(NC) Gemini API key updated"

# ========================================
# Application Deployment Targets
# ========================================

deploy-app: ## Deploy application to Cloud Run (build + push + deploy)
	@echo "$(GREEN)Deploying application...$(NC)"
	@./deploy.sh

deploy-app-quick: ## Quick deploy (skip build, push existing image)
	@echo "$(GREEN)Quick deploying application...$(NC)"
	@./deploy.sh --skip-build

# ========================================
# Information Targets
# ========================================

info: ## Show current configuration
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(BLUE)PitchHub Dashboard Configuration$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@echo "Terraform Directory: $(TERRAFORM_DIR)"
	@echo "Variables File:      $(TFVARS_FILE)"
	@echo ""
	@if [ -f "$(TFVARS_FILE)" ]; then \
		echo "$(GREEN)Configuration:$(NC)"; \
		grep -E '^[a-zA-Z_]+ *=' $(TFVARS_FILE) | grep -v '^#' || true; \
	else \
		echo "$(YELLOW)terraform.tfvars not found$(NC)"; \
	fi

state-list: ## List all resources in Terraform state
	@$(TERRAFORM) state list

show: ## Show complete Terraform state
	@$(TERRAFORM) show

# ========================================
# Cleanup Targets
# ========================================

clean: ## Clean up temporary files
	@rm -f $(TFPLAN_FILE)
	@echo "$(GREEN)✓$(NC) Cleaned up temporary files"

clean-all: clean ## Clean up all Terraform files (use with caution)
	@echo "$(RED)WARNING:$(NC) This will remove .terraform directory and state files"
	@echo "Type 'clean' to confirm:"
	@read confirm; \
	if [ "$$confirm" != "clean" ]; then \
		echo "$(YELLOW)Aborted.$(NC)"; \
		exit 1; \
	fi
	@rm -rf .terraform
	@rm -f .terraform.lock.hcl
	@rm -f terraform.tfstate*
	@echo "$(GREEN)✓$(NC) All Terraform files cleaned"

# ========================================
# Utility Targets
# ========================================

logs: ## View Cloud Run service logs
	@echo "$(GREEN)Fetching logs...$(NC)"
	@gcloud run services logs tail pitchhub-dashboard \
		--region=us-central1 \
		--project=ces2026-483021 \
		--limit=50

describe: ## Describe Cloud Run service
	@gcloud run services describe pitchhub-dashboard \
		--region=us-central1 \
		--project=ces2026-483021

test-deployment: ## Test deployed service
	@echo "$(GREEN)Testing deployment...$(NC)"
	@SERVICE_URL=$$($(TERRAFORM) output -raw cloud_run_url 2>/dev/null || echo ""); \
	if [ -z "$$SERVICE_URL" ]; then \
		echo "$(RED)ERROR:$(NC) Could not get service URL from Terraform"; \
		exit 1; \
	fi; \
	echo "Service URL: $$SERVICE_URL"; \
	echo "Testing HTTP endpoint..."; \
	curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" $$SERVICE_URL
