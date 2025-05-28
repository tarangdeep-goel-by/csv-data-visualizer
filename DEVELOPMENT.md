# Development Guide

This guide explains how to develop and run the CSV Data Visualizer application using Docker (recommended) or local development environments.

## 🐳 Docker Development (Recommended)

Docker provides a consistent, isolated environment that works the same way across all machines and operating systems.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Git](https://git-scm.com/) for version control

### Quick Start with Docker

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd csv-data-visualizer
   ```

2. **Start the application:**
   ```bash
   docker-compose up
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Health Check: http://localhost:8000/health

### Docker Development Commands

#### Basic Operations
```bash
# Start all services
docker-compose up

# Start in background (detached mode)
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild and start (after code changes)
docker-compose up --build

# View logs
docker-compose logs
docker-compose logs frontend  # Frontend logs only
docker-compose logs backend   # Backend logs only
```

#### Development Workflow
```bash
# Check running containers
docker-compose ps

# Execute commands inside containers
docker-compose exec backend python -m pytest              # Run tests
docker-compose exec backend python -m pytest -v          # Verbose tests
docker-compose exec frontend npm run build                # Build frontend
docker-compose exec backend python -c "import pandas; print(pandas.__version__)"  # Check Python packages

# Access container shell
docker-compose exec backend bash    # Backend shell
docker-compose exec frontend sh     # Frontend shell (Alpine Linux)
```

#### Debugging and Troubleshooting
```bash
# View container resource usage
docker stats

# Clean up everything (removes containers, networks, images)
docker-compose down --rmi all --volumes --remove-orphans

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up
```

### Docker Environment Configuration

The application uses environment variables for configuration:

- **Backend:** Set via `docker-compose.yml` environment section
- **Frontend:** Uses `VITE_API_BASE_URL` for API endpoint

```yaml
# Example docker-compose.yml environment section
environment:
  - ENVIRONMENT=development
  - DATA_DIR=./data
  - ALLOWED_ORIGINS=["http://localhost:5173"]
  - VITE_API_BASE_URL=http://localhost:8000
```

### Data Persistence

Docker containers share data through volume mounts:
- `./data:/app/data` - Backend data directory (CSV files, metadata)
- Data persists between container restarts
- Data is stored on your local machine, not inside containers

---

## 💻 Local Development Environment

If you need to run the application locally (without Docker), follow these steps:

### Prerequisites

- **Python 3.11+** with pip
- **Node.js 18+** with npm
- **Git** for version control

### Setting Up Local Environment

#### 1. Clone and Navigate
```bash
git clone <repository-url>
cd csv-data-visualizer
```

#### 2. Backend Setup (Python)
```bash
# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install Python dependencies
cd backend
pip install -r requirements.txt

# Create data directory
mkdir -p data/versions

# Run backend server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Frontend Setup (Node.js)
```bash
# In a new terminal
cd frontend

# Install Node.js dependencies
npm install

# Start development server
npm run dev
```

#### 4. Access the Application
- Frontend: http://localhost:5173 (or the port shown by Vite)
- Backend API: http://localhost:8000
- API Health Check: http://localhost:8000/health

### Local Development Commands

#### Backend Commands
```bash
# Activate virtual environment (always run this first)
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Run backend
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Run tests
python -m pytest
python -m pytest -v  # Verbose output
python -m pytest tests/test_api.py  # Specific test file

# Install new Python packages
pip install package-name
pip freeze > requirements.txt  # Update requirements
```

#### Frontend Commands
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install new packages
npm install package-name
npm install --save-dev package-name  # Development dependency
```

### Local Environment Variables

Create a `.env` file in the backend directory:
```bash
# backend/.env
ENVIRONMENT=development
DATA_DIR=./data
ALLOWED_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

Create a `.env.local` file in the frontend directory:
```bash
# frontend/.env.local
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🧹 Switching Between Environments

### Removing Local Development Files

If you want to clean up local development files and use only Docker:

```bash
# Remove Python virtual environments
rm -rf venv venv311

# Remove Node.js dependencies
rm -rf frontend/node_modules frontend/dist

# Remove cache directories
rm -rf .pytest_cache backend/.pytest_cache backend/__pycache__

# Remove local environment files (optional)
rm -f backend/.env frontend/.env.local
```

**Note:** You can always recreate these by following the "Local Development Environment" section.

### Recreating Local Environment

After cleanup, to recreate local development:

1. Follow the "Setting Up Local Environment" section above
2. All configuration files (`package.json`, `requirements.txt`) are preserved
3. Dependencies will be reinstalled fresh

---

## 🔧 Common Development Tasks

### Adding New Dependencies

#### Docker Environment
```bash
# Backend: Add to backend/requirements.txt, then rebuild
echo "new-package==1.0.0" >> backend/requirements.txt
docker-compose build backend
docker-compose up

# Frontend: Add via package.json, then rebuild  
docker-compose exec frontend npm install new-package
docker-compose build frontend
```

#### Local Environment
```bash
# Backend
source venv/bin/activate
pip install new-package
pip freeze > backend/requirements.txt

# Frontend
cd frontend
npm install new-package
```

### Running Tests

#### Docker
```bash
docker-compose exec backend python -m pytest
```

#### Local
```bash
source venv/bin/activate
cd backend
python -m pytest
```

### Database/Data Management

Both environments share the same `data/` directory:
- CSV files and metadata are stored in `./data/`
- Version snapshots in `./data/versions/`
- Data persists between runs in both Docker and local environments

---

## 🚀 Production Deployment

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md) which covers:
- Cloud deployment (Railway, Vercel, AWS)
- Environment configuration
- CI/CD pipelines
- Monitoring and scaling

---

## 🆘 Troubleshooting

### Docker Issues
```bash
# Port conflicts
docker-compose down
docker-compose up

# Permission issues (macOS/Linux)
sudo chown -R $USER:$USER ./data

# Complete reset
docker-compose down --volumes --rmi all
docker-compose up --build
```

### Local Development Issues
```bash
# Python virtual environment issues
deactivate  # Exit current venv
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Node.js issues
rm -rf frontend/node_modules frontend/package-lock.json
cd frontend
npm install
```

### Port Conflicts
```bash
# Find processes using ports
lsof -i :5173  # Frontend port
lsof -i :8000  # Backend port

# Kill conflicting processes
kill <PID>
```

---

## 📋 Quick Reference

| Task | Docker Command | Local Command |
|------|----------------|---------------|
| Start app | `docker-compose up` | `source venv/bin/activate && cd backend && uvicorn app.main:app --reload` + `cd frontend && npm run dev` |
| Run tests | `docker-compose exec backend python -m pytest` | `source venv/bin/activate && cd backend && python -m pytest` |
| Stop app | `docker-compose down` | `Ctrl+C` in each terminal |
| View logs | `docker-compose logs` | Check terminal output |
| Clean up | `docker-compose down --volumes` | `rm -rf venv frontend/node_modules` |

## 🎯 Recommended Workflow

1. **Use Docker for daily development** - Consistent, isolated environment
2. **Use local environment for debugging** - When you need direct access to tools
3. **Use Docker for testing** - Matches production environment
4. **Use Docker for deployment** - Same containers from dev to production

This approach gives you flexibility while maintaining consistency and reliability. 