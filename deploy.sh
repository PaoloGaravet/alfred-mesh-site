#!/bin/bash

# Script per deployare solo i file frontend senza le Azure Functions
# Le Azure Functions le deployeremo separatamente

DEPLOYMENT_TOKEN="e328878a461e210e3c38b22ceb7ff9316968df39110a657857aca8292899591b03-9f51dea1-7e8a-4b84-af65-e916d7662fa50032617091f8b903"

echo "Deploying frontend files to Azure Static Web Apps..."

# Crea un archivio temporaneo con i file da deployare
TEMP_DIR=$(mktemp -d)
cp -r *.html *.css *.js images "$TEMP_DIR/" 2>/dev/null || true

# Deploy usando l'API di Azure Static Web Apps
cd "$TEMP_DIR"
zip -r deploy.zip . -x "*.DS_Store" -x "node_modules/*" -x "api/*"

curl -X POST \
  "https://proud-pebble-091f8b903.azurestaticapps.net/deploy" \
  -H "Authorization: Bearer $DEPLOYMENT_TOKEN" \
  -F "file=@deploy.zip"

# Cleanup
rm -rf "$TEMP_DIR"

echo "Deploy completed!"
