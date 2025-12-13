#!/bin/bash

echo "🚀 Setting up Cash Transaction Application..."
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

command -v node >/dev/null 2>&1 || { 
    echo "❌ Node.js is required. Please install Node.js v18 or higher."
    exit 1
}

command -v docker >/dev/null 2>&1 || { 
    echo "❌ Docker is required. Please install Docker."
    exit 1
}

command -v npm >/dev/null 2>&1 || { 
    echo "❌ npm is required. Please install npm."
    exit 1
}

echo "✅ Prerequisites check passed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# Set up environment variables
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "   Please review and update .env if needed"
    else
        echo "⚠️  .env.example not found. Creating basic .env..."
        cat > .env << EOF
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-1
PORT=3000
EOF
        echo "✅ Created .env file"
    fi
else
    echo "ℹ️  .env file already exists"
fi

# Source .env file to load variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Start DynamoDB Local
echo ""
echo "🗄️  Starting DynamoDB Local..."
npm run dynamodb:start

# Wait for DynamoDB to be ready
echo ""
echo "⏳ Waiting for DynamoDB to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        echo "✅ DynamoDB Local is ready!"
        break
    fi
    sleep 1
done

# Create tables
echo ""
echo "📊 Creating tables..."
export DYNAMODB_ENDPOINT=${DYNAMODB_ENDPOINT:-http://localhost:8000}
export AWS_REGION=${AWS_REGION:-us-east-1}
npm run setup-tables

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Make sure DYNAMODB_ENDPOINT is set:"
echo "      export DYNAMODB_ENDPOINT=http://localhost:8000"
echo "      export AWS_REGION=us-east-1"
echo ""
echo "   2. Start the application:"
echo "      npm run dev"
echo ""
echo "   3. Or build and run:"
echo "      npm run build"
echo "      npm start"
echo ""
