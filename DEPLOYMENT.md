# 🚀 Deployment Guide - CSV Data Visualizer

## Overview
This guide covers multiple deployment options for your full-stack CSV Data Visualizer application, from quick cloud deployments to production-ready setups.

## Application Architecture
- **Backend**: FastAPI with Python 3.11
- **Frontend**: React 19 + TypeScript + Vite
- **Features**: File versioning, CSV visualization, storage management
- **Storage**: File-based data storage with metadata tracking

---

## 🎯 Quick Deployment (Recommended for Testing)

### Option 1: Vercel (Frontend) + Railway (Backend)

#### 1.1 Deploy Backend to Railway

1. **Create Railway Account**: Go to [railway.app](https://railway.app) and sign up
2. **Create New Project**: Click "New Project" → "Deploy from GitHub repo"
3. **Connect Repository**: Select your repository
4. **Configure Build**:
   - Railway will detect the `Dockerfile` automatically
   - Root directory: `/` (project root)
   - Build command: Uses Dockerfile
5. **Set Environment Variables**:
   ```
   ENVIRONMENT=production
   DATA_DIR=./data
   ALLOWED_ORIGINS=["*"]
   PORT=8000
   ```
6. **Deploy**: Railway will build and deploy automatically
7. **Get Backend URL**: Copy the generated Railway URL (e.g., `https://your-app-name.railway.app`)

#### 1.2 Deploy Frontend to Vercel

1. **Create Vercel Account**: Go to [vercel.com](https://vercel.com) and sign up
2. **Import Project**: Click "New Project" → Import from GitHub
3. **Configure Build**:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Set Environment Variables**:
   ```
   VITE_API_BASE_URL=https://your-railway-app.railway.app
   ```
5. **Deploy**: Vercel will build and deploy automatically

---

## 🏢 Production Deployment Options

### Option 2: AWS (Enterprise-Grade)

#### 2.1 Backend: AWS ECS/Fargate

```bash
# Build and push Docker image to ECR
aws ecr create-repository --repository-name csv-visualizer-backend
docker build -t csv-visualizer-backend .
docker tag csv-visualizer-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/csv-visualizer-backend:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/csv-visualizer-backend:latest

# Deploy using ECS
aws ecs create-cluster --cluster-name csv-visualizer
# Create task definition and service (see AWS documentation)
```

#### 2.2 Frontend: S3 + CloudFront

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://your-bucket-name --delete
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Option 3: VPS Deployment (Cost-Effective)

#### 3.1 VPS Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install Nginx
sudo apt install nginx

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 3.2 Backend Deployment

```bash
# Clone repository
git clone <your-repo-url>
cd csv-data-visualizer

# Build and run backend
docker build -t csv-backend .
docker run -d --name csv-backend -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  -e ENVIRONMENT=production \
  csv-backend
```

#### 3.3 Frontend Deployment

```bash
cd frontend
npm install
npm run build

# Copy to nginx directory
sudo cp -r dist/* /var/www/html/
```

#### 3.4 Nginx Configuration

```nginx
# /etc/nginx/sites-available/csv-visualizer
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/csv-visualizer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔧 Configuration for Production

### Backend Environment Variables
```bash
ENVIRONMENT=production
DATA_DIR=./data
ALLOWED_ORIGINS=["https://your-frontend-domain.com"]
SECRET_KEY=your-super-secret-key-here
LOG_LEVEL=INFO
MAX_FILE_SIZE_MB=100
```

### Frontend Environment Variables
```bash
VITE_API_BASE_URL=https://your-backend-domain.com
NODE_ENV=production
```

---

## 🔒 Security Considerations

### 1. CORS Configuration
Update `ALLOWED_ORIGINS` in backend to specific frontend domains:
```python
ALLOWED_ORIGINS=["https://your-frontend-domain.com", "https://www.your-domain.com"]
```

### 2. File Upload Security
- Implement file size limits
- Validate file types strictly
- Add virus scanning for uploaded files
- Use temporary directories with cleanup

### 3. Rate Limiting
Add rate limiting to prevent abuse:
```python
# Add to backend requirements.txt
slowapi==0.1.9

# Add to main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/upload")
@limiter.limit("5/minute")  # 5 uploads per minute
async def upload_file(request: Request, file: UploadFile = File(...)):
    # ... existing code
```

### 4. HTTPS Setup
For production, always use HTTPS:
- Use Let's Encrypt for free SSL certificates
- Configure proper SSL headers
- Implement HSTS (HTTP Strict Transport Security)

---

## 📊 Monitoring & Maintenance

### 1. Health Checks
The application includes a `/health` endpoint for monitoring.

### 2. Logging
Configure structured logging for production:
```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            'timestamp': record.created,
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module
        })
```

### 3. Database Backup (if using DB)
If you migrate to database storage:
```bash
# Example for PostgreSQL
pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 4. File Storage Backup
```bash
# Backup data directory
tar -czf data_backup_$(date +%Y%m%d_%H%M%S).tar.gz data/
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy CSV Visualizer

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        uses: railway-community/railway-action@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 📝 Pre-Deployment Checklist

### Backend
- [ ] Health check endpoint working
- [ ] Environment variables configured
- [ ] CORS origins set correctly
- [ ] File upload limits configured
- [ ] Data directory permissions set
- [ ] Docker image builds successfully

### Frontend
- [ ] API base URL configured for production
- [ ] Build process completes without errors
- [ ] All environment variables set
- [ ] Static assets loading correctly
- [ ] Error boundaries implemented

### Infrastructure
- [ ] SSL certificates configured
- [ ] Database backups scheduled (if applicable)
- [ ] Monitoring and alerts set up
- [ ] Load balancer configured (if needed)
- [ ] CDN configured for static assets

---

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `ALLOWED_ORIGINS` configuration
   - Ensure frontend URL matches exactly

2. **File Upload Fails**
   - Check file size limits
   - Verify data directory permissions
   - Check available disk space

3. **Build Failures**
   - Verify Node.js version compatibility
   - Check environment variables
   - Clear npm/yarn cache

4. **Connection Issues**
   - Verify API base URL configuration
   - Check network security groups/firewalls
   - Confirm services are running on correct ports

### Performance Optimization

1. **Frontend**
   - Enable gzip compression
   - Implement code splitting
   - Optimize bundle size
   - Use CDN for static assets

2. **Backend**
   - Implement caching for metadata
   - Add database connection pooling (if using DB)
   - Optimize file processing
   - Add request/response compression

---

## 📞 Support

For deployment issues:
1. Check application logs
2. Verify environment configuration
3. Test health endpoints
4. Monitor resource usage

Remember to test your deployment thoroughly in a staging environment before going to production! 