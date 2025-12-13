#!/bin/bash

echo "🛑 Stopping DynamoDB Local..."

if docker ps | grep -q dynamodb-local; then
    docker stop dynamodb-local
    echo "✅ DynamoDB Local stopped"
else
    echo "ℹ️  DynamoDB Local is not running"
fi
