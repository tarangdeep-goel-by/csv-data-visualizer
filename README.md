# CSV Data Visualizer

A modern web application for visualizing and analyzing CSV data. Built with React, TypeScript, and Python FastAPI.

## Features

- CSV file upload and download
- Automatic metadata extraction
- Interactive data visualization
- Sample data preview
- Modern, responsive UI

## Tech Stack

### Frontend
- React with TypeScript
- Material-UI (MUI)
- Axios for API calls
- Vite for build tooling

### Backend
- Python FastAPI
- Pandas for data manipulation
- CORS support
- File handling capabilities

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd csv-data-visualizer
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up the frontend:
```bash
cd frontend
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd backend
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
uvicorn app.main:app --reload
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

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