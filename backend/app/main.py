from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import pandas as pd
import os
from typing import Dict, Any
import json

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create data directory if it doesn't exist
os.makedirs("data", exist_ok=True)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    # Read the CSV file
    df = pd.read_csv(file.file)
    
    # Save the original file
    file_path = os.path.join("data", "original_data.csv")
    df.to_csv(file_path, index=False)
    
    # Generate metadata
    metadata = {
        "columns": df.columns.tolist(),
        "row_count": len(df),
        "column_types": df.dtypes.astype(str).to_dict(),
        "sample_data": df.head(5).to_dict(orient="records")
    }
    
    return metadata

@app.get("/metadata")
async def get_metadata() -> Dict[str, Any]:
    file_path = os.path.join("data", "original_data.csv")
    
    if not os.path.exists(file_path):
        return {"error": "No data file found"}
    
    df = pd.read_csv(file_path)
    
    metadata = {
        "columns": df.columns.tolist(),
        "row_count": len(df),
        "column_types": df.dtypes.astype(str).to_dict(),
        "sample_data": df.head(5).to_dict(orient="records")
    }
    
    return metadata

@app.get("/download")
async def download_file():
    file_path = os.path.join("data", "original_data.csv")
    
    if not os.path.exists(file_path):
        return {"error": "No data file found"}
    
    return FileResponse(
        file_path,
        media_type="text/csv",
        filename="data.csv",
        headers={"Content-Disposition": "attachment; filename=data.csv"}
    ) 