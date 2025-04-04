from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import pandas as pd
import os
from typing import Dict, Any, List, Optional, Union
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

class ValueFilter(BaseModel):
    type: str = "value"
    values: List[str]

class RangeFilter(BaseModel):
    type: str = "range"
    min: float
    max: float

class ColumnFilter(BaseModel):
    column: str
    filter: Union[ValueFilter, RangeFilter]

class FilterRequest(BaseModel):
    dimensions: List[str]
    metrics: List[str]
    filters: List[ColumnFilter]
    visualization_metrics: Optional[List[str]] = None

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

def apply_filters(df: pd.DataFrame, filters: List[ColumnFilter]) -> pd.DataFrame:
    """Apply filters to the dataframe."""
    if not filters:
        return df
    
    for column_filter in filters:
        column = column_filter.column
        filter_data = column_filter.filter
        
        if filter_data.type == "value":
            df = df[df[column].isin(filter_data.values)]
        elif filter_data.type == "range":
            df = df[(df[column] >= filter_data.min) & (df[column] <= filter_data.max)]
    
    return df

def round_numeric_values(df: pd.DataFrame, metrics: List[str]) -> pd.DataFrame:
    """Round numeric values in metric columns to 2 decimal places."""
    df_copy = df.copy()
    for column in df_copy.columns:
        if pd.api.types.is_numeric_dtype(df_copy[column]):
            df_copy[column] = df_copy[column].round(2)
    return df_copy

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
        raise HTTPException(status_code=404, detail="No data file found")
    
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
            "total_rows": 0,
            "visualization_data": []
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
    
    # Create a copy for table data
    table_df = df.copy()
    
    # Group by dimensions and aggregate metrics for table data
    if request.metrics:
        agg_dict = {metric: 'sum' for metric in request.metrics}
        table_df = table_df.groupby(request.dimensions, as_index=False).agg(agg_dict)
        # Round numeric values after aggregation
        table_df = round_numeric_values(table_df, request.metrics)
    else:
        # If no metrics, just get unique combinations of dimensions
        table_df = table_df[request.dimensions].drop_duplicates()
    
    # Prepare visualization data if visualization metrics are specified
    visualization_data = []
    if request.visualization_metrics:
        # Create a copy for visualization data
        vis_df = df[request.dimensions + request.visualization_metrics].copy()
        
        # Ensure all visualization metrics exist in the dataframe
        if not all(metric in vis_df.columns for metric in request.visualization_metrics):
            raise HTTPException(
                status_code=400,
                detail="Invalid visualization metrics requested"
            )
        
        # Find if there's a dimension with multiple values selected for comparison
        comparison_filter = next(
            (f for f in request.filters if f.filter.type == "value" and len(f.filter.values) > 1),
            None
        )
        
        if comparison_filter and comparison_filter.column in request.dimensions:
            # For comparison view, we need to keep both the index dimension and comparison dimension
            index_dim = request.dimensions[0]
            comparison_dim = comparison_filter.column
            
            # Create separate series for each value in the comparison dimension
            result_dfs = []
            for value in comparison_filter.filter.values:
                # Filter data for this specific value
                value_df = vis_df[vis_df[comparison_dim] == value].copy()
                
                # Group by index dimension first
                agg_dict = {metric: 'sum' for metric in request.visualization_metrics}
                value_df = value_df.groupby(index_dim, as_index=False).agg(agg_dict)
                
                # Rename metrics to include the dimension value
                for metric in request.visualization_metrics:
                    value_df[f"{metric} ({comparison_dim}: {value})"] = value_df[metric]
                    value_df.drop(columns=[metric], inplace=True)
                
                # Keep only necessary columns
                value_df = value_df[[index_dim] + [f"{metric} ({comparison_dim}: {value})" for metric in request.visualization_metrics]]
                result_dfs.append(value_df)
            
            # Merge all value-specific dataframes on the index dimension
            if result_dfs:
                vis_df = result_dfs[0]
                for df in result_dfs[1:]:
                    vis_df = pd.merge(vis_df, df, on=index_dim, how='outer')
            
            # Set the index column
            vis_df['index'] = vis_df[index_dim]
            
        else:
            # Regular aggregation for non-comparison view
            if len(request.dimensions) > 1:
                # Use the first dimension as the index for visualization
                index_dim = request.dimensions[0]
                
                # Group by the index dimension and aggregate metrics
                agg_dict = {metric: 'sum' for metric in request.visualization_metrics}
                vis_df = vis_df.groupby(index_dim, as_index=False).agg(agg_dict)
            
            # Use the index dimension as the x-axis
            vis_df['index'] = vis_df[request.dimensions[0]]
        
        visualization_data = vis_df.to_dict(orient="records")
    
    return {
        "data": table_df.to_dict(orient="records"),
        "total_rows": len(table_df),
        "visualization_data": visualization_data
    }

@app.post("/download/filtered")
async def download_filtered_data(filter_request: FilterRequest):
    file_path = os.path.join("data", "original_data.csv")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="No data file found")
    
    df = pd.read_csv(file_path)
    
    # Apply filters
    if filter_request.filters:
        df = apply_filters(df, filter_request.filters)
    
    # Ensure all requested columns exist
    all_columns = set(df.columns)
    requested_columns = set(filter_request.dimensions + filter_request.metrics)
    if not requested_columns.issubset(all_columns):
        raise HTTPException(
            status_code=400,
            detail="Invalid columns requested"
        )
    
    # Select only requested columns
    df = df[filter_request.dimensions + filter_request.metrics]
    
    # Round numeric values before creating CSV
    df = round_numeric_values(df, filter_request.metrics)
    
    # Create CSV string
    csv_string = df.to_csv(index=False)
    
    return StreamingResponse(
        StringIO(csv_string),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=filtered_data.csv"}
    )

@app.post("/data/unique-values/{column}")
async def get_unique_values(column: str, filter_request: FilterRequest) -> Dict[str, List[str]]:
    """Get unique values for a specific column based on current filters."""
    file_path = os.path.join("data", "original_data.csv")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="No data file found")
    
    df = pd.read_csv(file_path)
    
    if column not in df.columns:
        raise HTTPException(status_code=400, detail="Column not found")
    
    # Apply existing filters first
    if filter_request.filters:
        df = apply_filters(df, filter_request.filters)
    
    # Round numeric values if the column is numeric
    if pd.api.types.is_numeric_dtype(df[column]):
        df[column] = df[column].round(2)
    
    # Get unique values for the requested column
    unique_values = df[column].unique().tolist()
    # Convert all values to strings for consistency
    unique_values = [str(val) for val in unique_values if pd.notna(val)]
    unique_values.sort()
    
    return {"values": unique_values} 