from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import pandas as pd
import os
from typing import Dict, Any, List
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

def classify_columns(df: pd.DataFrame) -> Dict[str, List[str]]:
    """Classify columns as dimensions (string) or metrics (numeric)."""
    dimensions = []
    metrics = []
    
    for column in df.columns:
        if pd.api.types.is_numeric_dtype(df[column]):
            metrics.append(column)
        else:
            dimensions.append(column)
    
    return {
        "dimensions": dimensions,
        "metrics": metrics
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    # Read the CSV file
    df = pd.read_csv(file.file)
    
    # Save the original file
    file_path = os.path.join("data", "original_data.csv")
    df.to_csv(file_path, index=False)
    
    # Classify columns
    column_classifications = classify_columns(df)
    
    # Generate metadata
    metadata = {
        "columns": df.columns.tolist(),
        "row_count": len(df),
        "column_types": df.dtypes.astype(str).to_dict(),
        "sample_data": df.head(5).to_dict(orient="records"),
        "column_classifications": column_classifications
    }
    
    # Save metadata
    metadata_path = os.path.join("data", "metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f)
    
    return metadata

@app.get("/metadata")
async def get_metadata() -> Dict[str, Any]:
    metadata_path = os.path.join("data", "metadata.json")
    
    if not os.path.exists(metadata_path):
        return {"error": "No metadata found"}
    
    with open(metadata_path, "r") as f:
        return json.load(f)

@app.get("/data")
async def get_data() -> Dict[str, Any]:
    file_path = os.path.join("data", "original_data.csv")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="No data file found")
    
    df = pd.read_csv(file_path)
    return {
        "data": df.to_dict(orient="records"),
        "total_rows": len(df)
    }

@app.put("/metadata/classifications")
async def update_classifications(classifications: Dict[str, List[str]]) -> Dict[str, Any]:
    metadata_path = os.path.join("data", "metadata.json")
    
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="No metadata found")
    
    with open(metadata_path, "r") as f:
        metadata = json.load(f)
    
    # Validate that all columns exist
    all_columns = set(metadata["columns"])
    provided_columns = set(classifications["dimensions"] + classifications["metrics"])
    
    if not all_columns.issubset(provided_columns):
        raise HTTPException(
            status_code=400,
            detail="Invalid classifications: some columns are missing or extra"
        )
    
    metadata["column_classifications"] = classifications
    
    with open(metadata_path, "w") as f:
        json.dump(metadata, f)
    
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