#!/bin/bash

# CSV Data Visualizer Deployment Script
# Usage: ./deploy.sh [option]
# Options: test, production, vps

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    echo_info "Checking prerequisites..."
    
    if ! command_exists git; then
        echo_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    if ! command_exists node; then
        echo_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command_exists npm; then
        echo_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    echo_success "All prerequisites are installed."
}

# Function to build frontend
build_frontend() {
    echo_info "Building frontend..."
    
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        echo_info "Installing frontend dependencies..."
        npm install
    fi
    
    echo_info "Building frontend for production..."
    npm run build
    
    cd ..
    echo_success "Frontend built successfully!"
}

# Function to test Docker build
test_docker_build() {
    echo_info "Testing Docker build..."
    
    if ! command_exists docker; then
        echo_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    echo_info "Building Docker image..."
    docker build -t csv-visualizer-backend:test .
    
    echo_success "Docker image built successfully!"
}

# Function for test deployment
deploy_test() {
    echo_info "Starting test deployment process..."
    
    check_prerequisites
    build_frontend
    test_docker_build
    
    echo_info "Test deployment completed successfully!"
    echo_warning "Next steps:"
    echo "1. Push your code to GitHub"
    echo "2. Deploy backend to Railway: https://railway.app"
    echo "3. Deploy frontend to Vercel: https://vercel.com"
    echo "4. Set environment variables as described in DEPLOYMENT.md"
}

# Function for VPS deployment
deploy_vps() {
    echo_info "Starting VPS deployment process..."
    
    check_prerequisites
    
    # Check if we're on a VPS (basic check)
    if [ ! -f /etc/os-release ]; then
        echo_error "This doesn't appear to be a Linux VPS. Please run this on your VPS."
        exit 1
    fi
    
    # Install Docker if not present
    if ! command_exists docker; then
        echo_info "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        sudo usermod -aG docker $USER
        echo_warning "Please log out and log back in for Docker permissions to take effect."
    fi
    
    # Install Nginx if not present
    if ! command_exists nginx; then
        echo_info "Installing Nginx..."
        sudo apt update
        sudo apt install -y nginx
    fi
    
    # Build frontend
    build_frontend
    
    # Build and run backend
    echo_info "Building and starting backend..."
    docker build -t csv-backend .
    
    # Stop existing container if running
    docker stop csv-backend 2>/dev/null || true
    docker rm csv-backend 2>/dev/null || true
    
    # Run new container
    docker run -d --name csv-backend -p 8000:8000 \
        -v $(pwd)/data:/app/data \
        -e ENVIRONMENT=production \
        csv-backend
    
    # Deploy frontend to nginx
    echo_info "Deploying frontend to Nginx..."
    sudo cp -r frontend/dist/* /var/www/html/
    
    echo_success "VPS deployment completed!"
    echo_info "Your application should be accessible at http://your-server-ip"
    echo_warning "Don't forget to:"
    echo "1. Configure your domain name"
    echo "2. Set up SSL with Let's Encrypt"
    echo "3. Configure firewall rules"
}

# Function to show usage
show_usage() {
    echo "CSV Data Visualizer Deployment Script"
    echo ""
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  test        - Prepare for cloud deployment (Railway + Vercel)"
    echo "  vps         - Deploy to VPS (requires Linux server)"
    echo "  production  - Same as test (prepare for cloud deployment)"
    echo ""
    echo "Examples:"
    echo "  $0 test       # Prepare for Railway + Vercel deployment"
    echo "  $0 vps        # Deploy directly to VPS"
    echo ""
}

# Main script logic
case "${1:-}" in
    "test"|"production")
        deploy_test
        ;;
    "vps")
        deploy_vps
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        echo_error "Invalid option: ${1:-}"
        show_usage
        exit 1
        ;;
esac 