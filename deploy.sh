#!/bin/bash
# Backend Deployment Script for Railway

echo "🚀 Preparing backend for Railway deployment..."

# Check if all required files exist
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

if [ ! -f "src/index.ts" ]; then
    echo "❌ src/index.ts not found!"
    exit 1
fi

# Install dependencies (for local testing)
echo "📦 Installing dependencies..."
npm install

# Build the project (for local testing)
echo "🔨 Building project..."
npm run build

echo "✅ Backend ready for Railway deployment!"
echo "📋 Next steps:"
echo "   1. Push this folder to a Git repository"
echo "   2. Connect the repository to Railway"
echo "   3. Set environment variables in Railway dashboard"
echo "   4. Deploy!"