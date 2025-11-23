#!/bin/bash

# Setup script for code-review-assistant skill
# Checks environment variables and installs dependencies

set -e

echo "🔧 Setting up code-review-assistant skill..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to check if .env file exists by searching up directory tree
find_env_file() {
    local dir="$PWD"
    while [[ "$dir" != "/" ]]; do
        if [[ -f "$dir/.env" ]]; then
            echo "$dir/.env"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

# Function to check env var (either in process or .env)
check_env_var() {
    local var_name=$1
    local var_value="${!var_name}"
    
    # Check if already in environment
    if [[ -n "$var_value" ]]; then
        echo "  ✓ $var_name (from environment)"
        return 0
    fi
    
    # Check if in .env file
    if [[ -n "$ENV_FILE" ]] && grep -q "^${var_name}=" "$ENV_FILE" 2>/dev/null; then
        local value=$(grep "^${var_name}=" "$ENV_FILE" | cut -d'=' -f2-)
        if [[ -n "$value" && "$value" != "your_"* ]]; then
            echo "  ✓ $var_name (from .env)"
            return 0
        fi
    fi
    
    echo "  ✗ $var_name (not set)"
    return 1
}

echo "📋 Checking environment variables..."
echo ""

# Find .env file
ENV_FILE=$(find_env_file || echo "")
if [[ -n "$ENV_FILE" ]]; then
    echo "Found .env file: $ENV_FILE"
    echo ""
fi

# Check required variables
missing_vars=0

echo "Required for diagram generation:"
check_env_var "GEMINI_API_KEY" || ((missing_vars++))

echo ""
echo "Required for diagram upload:"
check_env_var "CLOUDINARY_CLOUD_NAME" || ((missing_vars++))
check_env_var "CLOUDINARY_API_KEY" || ((missing_vars++))
check_env_var "CLOUDINARY_API_SECRET" || ((missing_vars++))

echo ""

if [[ $missing_vars -gt 0 ]]; then
    echo "⚠️  Warning: $missing_vars environment variable(s) missing"
    echo ""
    echo "To fix this, create a .env file in your repository root with:"
    echo ""
    echo "  GEMINI_API_KEY=your_gemini_api_key"
    echo "  CLOUDINARY_CLOUD_NAME=your_cloud_name"
    echo "  CLOUDINARY_API_KEY=your_api_key"
    echo "  CLOUDINARY_API_SECRET=your_api_secret"
    echo ""
    echo "Get your keys from:"
    echo "  - Gemini: https://makersuite.google.com/app/apikey"
    echo "  - Cloudinary: https://cloudinary.com/console"
    echo ""
else
    echo "✅ All required environment variables are set!"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
echo ""

if command -v npm &> /dev/null; then
    npm install
    echo ""
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Error: npm not found. Please install Node.js first."
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "You can now use the scripts:"
echo "  node generate-diagram.js \"<description>\""
echo "  node upload-image.js <image-path>"

