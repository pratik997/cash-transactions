#!/bin/bash

# Script to start DynamoDB Local using Docker

echo "🚀 Starting DynamoDB Local with Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if container already exists and is running
if docker ps --format '{{.Names}}' | grep -q '^dynamodb-local$'; then
    echo "✅ DynamoDB Local is already running on port 8000"
    echo "   Access it at: http://localhost:8000"
    exit 0
fi

# Check if container exists but is stopped
if docker ps -a --format '{{.Names}}' | grep -q '^dynamodb-local$'; then
    echo "📦 Existing DynamoDB Local container found (stopped)"
    echo "🔄 Starting existing container..."
    docker start dynamodb-local
else
    echo "🆕 Creating new DynamoDB Local container with persistent storage..."
    # Create data directory if it doesn't exist
    mkdir -p ./dynamodb-data
    
    docker run -d \
        --name dynamodb-local \
        -p 8000:8000 \
        -v "$(pwd)/dynamodb-data:/home/dynamodblocal/data" \
        -w /home/dynamodblocal \
        amazon/dynamodb-local:latest \
        -jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal/data
fi

# Wait for DynamoDB to be ready
echo "⏳ Waiting for DynamoDB Local to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        echo "✅ DynamoDB Local is ready!"
        echo "   Endpoint: http://localhost:8000"
        echo "   Region: us-east-1"
        echo ""
        echo "To stop: docker stop dynamodb-local"
        echo "To remove: docker rm -f dynamodb-local"
        exit 0
    fi
    sleep 1
done

echo "❌ DynamoDB Local failed to start within 30 seconds"
exit 1
