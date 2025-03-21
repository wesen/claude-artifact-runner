#!/bin/bash

# Exit on error
set -e

# Check if go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed. Please install Go to continue."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js to continue."
    exit 1
fi

echo "Building frontend application..."
npm run build

echo "Building Go server with embedded frontend..."
go build -o artifact-runner .

echo "Build complete! The binary 'artifact-runner' contains the entire application."
echo "Run it with: ./artifact-runner"