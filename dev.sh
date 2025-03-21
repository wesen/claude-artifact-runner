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

# Check if air is installed (for Go hot reloading)
if ! command -v air &> /dev/null; then
    echo "Installing air for Go hot reloading..."
    go install github.com/cosmtrek/air@latest
fi

# Create air configuration file if it doesn't exist
if [ ! -f ".air.toml" ]; then
    cat > .air.toml << 'EOL'
root = "."
tmp_dir = "tmp"

[build]
bin = "./tmp/main -dev"
cmd = "go build -o ./tmp/main ."
delay = 1000
exclude_dir = ["node_modules", "dist", "tmp"]
include_ext = ["go", "html"]
exclude_regex = ["_test\\.go"]

[screen]
clear_on_rebuild = true
keep_scroll = true
EOL
    echo "Created .air.toml configuration file"
fi

# Start vite in background
echo "Starting Vite in watch mode..."
npm run dev -- --port 5173 &
VITE_PID=$!

# Clean up function
cleanup() {
    echo "Stopping Vite and Air..."
    kill $VITE_PID
    exit 0
}

# Register the cleanup function for when script is terminated
trap cleanup SIGINT SIGTERM

# Start air (Go hot reloader)
echo "Starting Go server with hot reloading..."
air

# This will not run unless air exits
cleanup