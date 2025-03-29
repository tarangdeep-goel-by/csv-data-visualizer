from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import pandas as pd
import os
from typing import Dict, Any, List, Optional
import json
from pydantic import BaseModel

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

class DimensionFlags(BaseModel):
    index_dimension: str
    time_dimension: Optional[str] = None

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

def get_default_index_dimension(dimensions: List[str]) -> str:
    """Get the first dimension as the default index dimension."""
    return dimensions[0] if dimensions else None

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    # Read the CSV file
    df = pd.read_csv(file.file)
    
    # Save the original file
    file_path = os.path.join("data", "original_data.csv")
    df.to_csv(file_path, index=False)
    
    # Classify columns
    column_classifications = classify_columns(df)
    
    # Set default index dimension
    index_dimension = get_default_index_dimension(column_classifications["dimensions"])
    
    # Generate metadata
    metadata = {
        "columns": df.columns.tolist(),
        "row_count": len(df),
        "column_types": df.dtypes.astype(str).to_dict(),
        "sample_data": df.head(5).to_dict(orient="records"),
        "column_classifications": column_classifications,
        "dimension_flags": {
            "index_dimension": index_dimension,
            "time_dimension": None
        }
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

@app.put("/metadata/dimension-flags")
async def update_dimension_flags(flags: DimensionFlags) -> Dict[str, Any]:
    metadata_path = os.path.join("data", "metadata.json")
    
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="No metadata found")
    
    with open(metadata_path, "r") as f:
        metadata = json.load(f)
    
    # Validate that the columns exist in the dataset
    all_columns = set(metadata["columns"])
    
    if flags.index_dimension not in all_columns:
        raise HTTPException(
            status_code=400,
            detail="Invalid index dimension: column does not exist"
        )
    
    if flags.time_dimension and flags.time_dimension not in all_columns:
        raise HTTPException(
            status_code=400,
            detail="Invalid time dimension: column does not exist"
        )
    
    metadata["dimension_flags"] = {
        "index_dimension": flags.index_dimension,
        "time_dimension": flags.time_dimension
    }
    
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