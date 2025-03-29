from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import pandas as pd
import os
from typing import Dict, Any, List, Optional
import json
from pydantic import BaseModel
from io import StringIO

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Create data directory if it doesn't exist
os.makedirs("data", exist_ok=True)

class DimensionFlags(BaseModel):
    index_dimension: str
    time_dimension: Optional[str] = None

class FilterRequest(BaseModel):
    dimensions: List[str]
    metrics: List[str]
    filters: Dict[str, Any]

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

def aggregate_data(df: pd.DataFrame, dimensions: List[str], metrics: List[str]) -> pd.DataFrame:
    """Aggregate data based on specified dimensions and metrics."""
    if not dimensions:
        return df
    
    # Group by dimensions and aggregate metrics
    agg_dict = {metric: 'sum' for metric in metrics}
    return df.groupby(dimensions).agg(agg_dict).reset_index()

def apply_filters(df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
    """Apply filters to the dataframe."""
    if not filters:
        return df
    
    for column, value in filters.items():
        if isinstance(value, list):
            df = df[df[column].isin(value)]
        elif isinstance(value, dict):
            if 'min' in value:
                df = df[df[column] >= value['min']]
            if 'max' in value:
                df = df[df[column] <= value['max']]
        else:
            df = df[df[column] == value]
    
    return df

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

@app.post("/data/filter")
async def filter_data(request: FilterRequest) -> Dict[str, Any]:
    file_path = os.path.join("data", "original_data.csv")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="No data file found")
    
    df = pd.read_csv(file_path)
    
    # If no dimensions selected, return empty result
    if not request.dimensions:
        return {
            "data": [],
            "total_rows": 0
        }
    
    # Apply filters first if any
    if request.filters:
        df = apply_filters(df, request.filters)
    
    # Ensure all requested dimensions exist in dataframe
    all_columns = set(df.columns)
    requested_columns = set(request.dimensions + request.metrics)
    if not requested_columns.issubset(all_columns):
        raise HTTPException(
            status_code=400,
            detail="Invalid columns requested"
        )
    
    # Group by dimensions and aggregate metrics
    if request.metrics:
        agg_dict = {metric: 'sum' for metric in request.metrics}
        df = df.groupby(request.dimensions, as_index=False).agg(agg_dict)
    else:
        # If no metrics, just get unique combinations of dimensions
        df = df[request.dimensions].drop_duplicates()
    
    return {
        "data": df.to_dict(orient="records"),
        "total_rows": len(df)
    }

@app.post("/data/download")
async def download_filtered_data(filter_request: FilterRequest):
    try:
        # Get the filtered data using the same logic as /data/filter
        file_path = os.path.join("data", "original_data.csv")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="No data file found")
            
        df = pd.read_csv(file_path)
        
        # Apply dimension and metric filtering
        selected_columns = filter_request.dimensions + filter_request.metrics
        df_filtered = df[selected_columns]
        
        # Group by dimensions if any
        if filter_request.dimensions:
            # Calculate aggregates for metrics
            aggs = {metric: 'sum' for metric in filter_request.metrics}
            df_filtered = df_filtered.groupby(filter_request.dimensions, as_index=False).agg(aggs)
        
        # Convert filtered DataFrame to CSV
        output = StringIO()
        df_filtered.to_csv(output, index=False)
        
        # Create response with CSV file
        response = StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                'Content-Disposition': 'attachment; filename=filtered_data.csv'
            }
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 