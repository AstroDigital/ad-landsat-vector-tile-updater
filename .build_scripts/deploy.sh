#!/bin/bash
set -e

# Create iron.json and then deploy
echo '{"token": "'$IRON_TOKEN'", "project_id": "'$IRON_PROJECT_ID'"}' > updater/iron.json
docker-compose run deploy
