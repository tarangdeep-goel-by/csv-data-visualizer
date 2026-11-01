# CSV Data Visualizer

A modern web application for visualizing and analyzing CSV data with advanced file versioning and filtering capabilities. Built with React, TypeScript, and Python FastAPI.

## ✨ Features

- **CSV file upload and processing** with robust validation
- **File versioning system** - Save and restore different data states
- **Advanced filtering and visualization** with interactive charts
- **Column classification** - Automatically detect dimensions and metrics
- **Data export** - Download filtered datasets
- **Real-time data preview** with pagination
- **Modern, responsive UI** built with Material-UI
- **Docker support** for consistent development and deployment

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) v6
- Recharts for data visualization
- Axios for API communication
- Vite for fast development and building

### Backend
- Python FastAPI with async support
- Pandas for data manipulation
- File versioning and metadata management
- CORS and security features
- Comprehensive test suite (38 tests)

### Infrastructure
- Docker and Docker Compose
- CI/CD pipelines (GitHub Actions)
- Cloud deployment ready (Railway, Vercel, AWS)

## 🚀 Quick Start (Docker - Recommended)

The fastest way to get started is with Docker:

```bash
# Clone the repository
git clone <repository-url>
cd csv-data-visualizer

# Start the application
docker-compose up

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
```

## 📖 Documentation

- **[Development Guide](./DEVELOPMENT.md)** - Complete guide for Docker and local development
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[API Documentation](http://localhost:8000/docs)** - Interactive API docs (when running)

## 🏗️ Development

Choose your preferred development environment:

### Option 1: Docker Development (Recommended)
```bash
docker-compose up
```
See [DEVELOPMENT.md](./DEVELOPMENT.md) for complete Docker workflows.

### Option 2: Local Development
```bash
# Backend
python -m venv venv
source venv/bin/activate
cd backend && pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend && npm install
npm run dev
```

### Running Tests
```bash
# Docker
docker-compose exec backend python -m pytest

# Local
cd backend && python -m pytest
```

## Development

### Project Structure

```
.
├── frontend/               # React frontend
│   ├── src/               # Source files
│   ├── public/            # Static files
│   └── package.json       # Dependencies
├── backend/               # FastAPI backend
│   ├── app/              # Application code
│   ├── data/             # Data storage
│   └── requirements.txt  # Dependencies
└── README.md             # This file
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 
## What came next

The last commit here is from May 2025. The next take on the same problem, asking questions of a CSV, is [ai-data-analyst-v2](https://github.com/tarangdeep-goel-by/ai-data-analyst-v2) (January 2026): instead of hand-built filters and charts, Gemini writes pandas code for each question. Its `docs/NOTES.md` has the full history, including this repo.
