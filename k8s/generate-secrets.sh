#!/usr/bin/env bash
set -euo pipefail

# Generate and apply curex-secrets from local environment variables.
# Usage:
#   source .env
#   ./k8s/generate-secrets.sh

: "${DB_USERNAME:?DB_USERNAME is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${RABBITMQ_USERNAME:?RABBITMQ_USERNAME is required}"
: "${RABBITMQ_PASSWORD:?RABBITMQ_PASSWORD is required}"
: "${MAIL_USERNAME:?MAIL_USERNAME is required}"
: "${MAIL_PASSWORD:?MAIL_PASSWORD is required}"
: "${TEXT_LK_API_TOKEN:?TEXT_LK_API_TOKEN is required}"
: "${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY is required}"
: "${STRIPE_WEBHOOK_SECRET:?STRIPE_WEBHOOK_SECRET is required}"
: "${CLOUDINARY_CLOUD_NAME:?CLOUDINARY_CLOUD_NAME is required}"
: "${CLOUDINARY_API_KEY:?CLOUDINARY_API_KEY is required}"
: "${CLOUDINARY_API_SECRET:?CLOUDINARY_API_SECRET is required}"

kubectl create secret generic curex-secrets \
  -n curex \
  --from-literal=db-username="${DB_USERNAME}" \
  --from-literal=db-password="${DB_PASSWORD}" \
  --from-literal=jwt-secret="${JWT_SECRET}" \
  --from-literal=rabbitmq-username="${RABBITMQ_USERNAME}" \
  --from-literal=rabbitmq-password="${RABBITMQ_PASSWORD}" \
  --from-literal=mail-username="${MAIL_USERNAME}" \
  --from-literal=mail-password="${MAIL_PASSWORD}" \
  --from-literal=text-lk-api-token="${TEXT_LK_API_TOKEN}" \
  --from-literal=stripe-secret-key="${STRIPE_SECRET_KEY}" \
  --from-literal=stripe-webhook-secret="${STRIPE_WEBHOOK_SECRET}" \
  --from-literal=cloudinary-cloud-name="${CLOUDINARY_CLOUD_NAME}" \
  --from-literal=cloudinary-api-key="${CLOUDINARY_API_KEY}" \
  --from-literal=cloudinary-api-secret="${CLOUDINARY_API_SECRET}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "curex-secrets applied in namespace curex"
