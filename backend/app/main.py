from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import pandas as pd
import os
from typing import Dict, Any, List, Optional
import json
from io import StringIO
import shutil
import uuid
import logging
from datetime import datetime, UTC

from .models import DimensionFlags, FilterRequest, Version, SaveVersionRequest
from .utils import (
    classify_columns,
    get_default_index_dimension,
    aggregate_data,
    apply_filters,
    round_numeric_values,
    validate_column_classifications
)
from .config import settings
from .version_manager import version_manager

app = FastAPI(title="Data Analysis API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Create data directory if it doesn't exist
os.makedirs(settings.DATA_DIR, exist_ok=True)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def normalize_datetime(dt):
    """Convert datetime to timezone-aware UTC if it's naive."""
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Upload and process a CSV file."""
    if not file.filename.endswith('.csv') or file.content_type != "text/csv":
        raise HTTPException(status_code=400, detail="Invalid file format. Only CSV files are supported.")
    
    try:
        df = pd.read_csv(file.file)
        
        if df.empty or len(df.columns) == 0:
            raise HTTPException(status_code=400, detail="Invalid CSV file: File is empty or has no columns")
        
        # Create data directory and save the original file
        os.makedirs(settings.DATA_DIR, exist_ok=True)
        df.to_csv(settings.get_data_path(), index=False)
        
        # Classify columns and generate metadata
        column_classifications = classify_columns(df)
        index_dimension = get_default_index_dimension(column_classifications["dimensions"])
        
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
        with open(settings.get_metadata_path(), "w") as f:
            json.dump(metadata, f)
        
        # Generate a new parent_id for this upload
        parent_id = str(uuid.uuid4())
        
        return {**metadata, "parent_id": parent_id}
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="Invalid CSV file: File is empty")
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Invalid CSV file: Unable to parse file")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@app.get("/metadata")
async def get_metadata() -> Dict[str, Any]:
    """Get metadata for the uploaded file."""
    if not os.path.exists(settings.get_metadata_path()):
        return {"error": "No metadata found"}
    
    with open(settings.get_metadata_path(), "r") as f:
        return json.load(f)

@app.get("/data")
async def get_data() -> Dict[str, Any]:
    """Get the complete dataset."""
    if not os.path.exists(settings.get_data_path()):
        raise HTTPException(status_code=404, detail="No data file found")
    
    df = pd.read_csv(settings.get_data_path())
    return {
        "data": df.to_dict(orient="records"),
        "total_rows": len(df)
    }

@app.put("/metadata/classifications")
async def update_classifications(classifications: Dict[str, List[str]]) -> Dict[str, Any]:
    """Update column classifications."""
    if not os.path.exists(settings.get_metadata_path()):
        raise HTTPException(status_code=404, detail="No metadata found")
    
    with open(settings.get_metadata_path(), "r") as f:
        metadata = json.load(f)
    
    validate_column_classifications(metadata["columns"], classifications)
    metadata["column_classifications"] = classifications
    
    with open(settings.get_metadata_path(), "w") as f:
        json.dump(metadata, f)
    
    return metadata

@app.put("/metadata/dimension-flags")
async def update_dimension_flags(flags: DimensionFlags) -> Dict[str, Any]:
    """Update dimension flags."""
    if not os.path.exists(settings.get_metadata_path()):
        raise HTTPException(status_code=404, detail="No metadata found")
    
    with open(settings.get_metadata_path(), "r") as f:
        metadata = json.load(f)
    
    # First check if the columns exist in the dataset
    all_columns = set(metadata["columns"])
    if flags.index_dimension not in all_columns:
        raise HTTPException(
            status_code=400,
            detail="column does not exist"
        )
    
    if flags.time_dimension and flags.time_dimension not in all_columns:
        raise HTTPException(
            status_code=400,
            detail="column does not exist"
        )
    
    # Then check if they are dimensions
    dimensions = metadata["column_classifications"]["dimensions"]
    if flags.index_dimension not in dimensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid index dimension: '{flags.index_dimension}' is not a dimension"
        )
    
    if flags.time_dimension and flags.time_dimension not in dimensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid time dimension: '{flags.time_dimension}' is not a dimension"
        )
    
    metadata["dimension_flags"] = flags.model_dump()
    
    with open(settings.get_metadata_path(), "w") as f:
        json.dump(metadata, f)
    
    return metadata

@app.get("/download")
async def download_file():
    """Download the complete dataset."""
    if not os.path.exists(settings.get_data_path()):
        raise HTTPException(status_code=404, detail="No data file found")
    
    return FileResponse(settings.get_data_path(), filename="data.csv")

@app.post("/data/filter")
async def filter_data(request: FilterRequest) -> Dict[str, Any]:
    """Filter and aggregate data based on specified criteria."""
    if not os.path.exists(settings.get_data_path()):
        raise HTTPException(status_code=404, detail="No data file found")
    
    try:
        df = pd.read_csv(settings.get_data_path())
        
        # Validate requested columns exist
        all_columns = set(df.columns)
        requested_columns = set(request.dimensions + request.metrics)
        if not requested_columns.issubset(all_columns):
            raise HTTPException(status_code=400, detail="Invalid columns requested")
        
        # Apply filters
        filtered_df = apply_filters(df, request.filters)
        
        # Aggregate data for table view
        result_df = aggregate_data(filtered_df, request.dimensions, request.metrics)
        result_df = round_numeric_values(result_df)
        
        # Prepare visualization data if metrics are specified
        visualization_data = []
        if request.visualization_metrics:
            vis_df = filtered_df.copy()
            
            # Find if there's a dimension with multiple values for comparison
            comparison_filter = next(
                (f for f in request.filters if f.filter.type == "value" and len(f.filter.values) > 1),
                None
            )
            
            if comparison_filter and comparison_filter.column in request.dimensions:
                # For comparison view, create separate series for each value
                index_dim = request.dimensions[0]
                comparison_dim = comparison_filter.column
                
                result_dfs = []
                for value in comparison_filter.filter.values:
                    value_df = vis_df[vis_df[comparison_dim] == value].copy()
                    agg_dict = {metric: 'sum' for metric in request.visualization_metrics}
                    value_df = value_df.groupby(index_dim, as_index=False).agg(agg_dict)
                    
                    # Rename metrics to include the dimension value
                    for metric in request.visualization_metrics:
                        value_df[f"{metric} ({comparison_dim}: {value})"] = value_df[metric]
                        value_df.drop(columns=[metric], inplace=True)
                    
                    result_dfs.append(value_df)
                
                # Merge all value-specific dataframes
                if result_dfs:
                    vis_df = result_dfs[0]
                    for df in result_dfs[1:]:
                        vis_df = pd.merge(vis_df, df, on=index_dim, how='outer')
                    vis_df = round_numeric_values(vis_df)
                    visualization_data = vis_df.to_dict(orient="records")
            else:
                # Regular aggregation for non-comparison view
                if request.dimensions:
                    index_dim = request.dimensions[0]
                    agg_dict = {metric: 'sum' for metric in request.visualization_metrics}
                    vis_df = vis_df.groupby(index_dim, as_index=False).agg(agg_dict)
                    vis_df = round_numeric_values(vis_df)
                    visualization_data = vis_df.to_dict(orient="records")
        
        return {
            "data": result_df.to_dict(orient="records"),
            "total_rows": len(result_df),
            "visualization_data": visualization_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/download/filtered")
async def download_filtered_data(filter_request: FilterRequest):
    """Download filtered and aggregated data."""
    if not os.path.exists(settings.get_data_path()):
        raise HTTPException(status_code=404, detail="No data file found")
    
    try:
        df = pd.read_csv(settings.get_data_path())
        
        # Validate requested columns exist
        all_columns = set(df.columns)
        requested_columns = set(filter_request.dimensions + filter_request.metrics)
        if not requested_columns.issubset(all_columns):
            raise HTTPException(status_code=400, detail="Invalid columns requested")
        
        # Apply filters
        filtered_df = apply_filters(df, filter_request.filters)
        
        # Select only requested columns and preserve null values
        result_df = filtered_df[filter_request.dimensions + filter_request.metrics].copy()
        
        # Create CSV string
        output = StringIO()
        result_df.to_csv(output, index=False, na_rep='')
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=filtered_data.csv"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/data/unique-values/{column}")
async def get_unique_values(column: str, filter_request: FilterRequest) -> Dict[str, List[str]]:
    """Get unique values for a column with optional filtering."""
    if not os.path.exists(settings.get_data_path()):
        raise HTTPException(status_code=404, detail="No data file found")
    
    try:
        df = pd.read_csv(settings.get_data_path())
        
        if column not in df.columns:
            raise HTTPException(status_code=400, detail="Column not found")
        
        filtered_df = apply_filters(df, filter_request.filters)
        unique_values = filtered_df[column].unique().tolist()
        
        # Convert numeric values to strings and handle NaN/None
        unique_values = [str(val) if pd.notna(val) else None for val in unique_values]
        unique_values = [val for val in unique_values if val is not None]
        
        return {"values": sorted(unique_values)}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/versions/save")
async def save_version(request: SaveVersionRequest, parent_id: str) -> Version:
    filter_criteria = request.filter_criteria
    name = request.name
    description = request.description
    created_by = request.created_by
    if not os.path.exists(settings.get_metadata_path()):
        raise HTTPException(status_code=404, detail="No metadata found")
    
    if not os.path.exists(settings.get_data_path()):
        raise HTTPException(status_code=404, detail="No data file found")
    
    # Get current metadata state
    with open(settings.get_metadata_path(), "r") as f:
        metadata = json.load(f)
    
    # Create version
    version = version_manager.create_version(
        parent_id=parent_id,
        name=name,
        description=description,
        created_by=created_by,
        filter_criteria=filter_criteria,
        metadata_state={
            "column_classifications": metadata["column_classifications"],
            "dimension_flags": metadata["dimension_flags"]
        },
        current_data_path=settings.get_data_path()
    )
    
    return version

@app.get("/versions/list")
async def list_versions(parent_id: str) -> List[Version]:
    """List all versions for a parent document."""
    return version_manager.list_versions(parent_id)

@app.get("/versions/{version_id}")
async def get_version_details(version_id: str) -> Version:
    """Get details of a specific version."""
    version = version_manager.get_version(version_id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version

@app.post("/versions/{version_id}/load")
async def load_version(version_id: str) -> Dict[str, Any]:
    """Load a specific version's state."""
    try:
        return version_manager.load_version(version_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/versions/{version_id}")
async def delete_version(version_id: str) -> Dict[str, bool]:
    """Delete a version."""
    success = version_manager.delete_version(version_id)
    if not success:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"success": True}

@app.post("/versions/{version_id}/activate")
async def activate_version(version_id: str) -> Dict[str, Any]:
    """Activate a version's snapshot as the current data file and restore its metadata."""
    version = version_manager.get_version(version_id)
    if not version or not version.data_path or not os.path.exists(version.data_path):
        raise HTTPException(status_code=404, detail="Version snapshot not found")

    # Copy the snapshot CSV to the main data file location
    shutil.copy2(version.data_path, settings.get_data_path())

    # Restore metadata state
    metadata = {
        "columns": pd.read_csv(version.data_path).columns.tolist(),
        "row_count": sum(1 for _ in open(version.data_path)) - 1,  # minus header
        "column_types": pd.read_csv(version.data_path, nrows=1).dtypes.astype(str).to_dict(),
        "sample_data": pd.read_csv(version.data_path, nrows=5).to_dict(orient="records"),
        "column_classifications": version.metadata_state["column_classifications"],
        "dimension_flags": version.metadata_state["dimension_flags"]
    }
    with open(settings.get_metadata_path(), "w") as f:
        json.dump(metadata, f)

    return {"success": True}

@app.get("/files/list")
async def list_uploaded_files() -> List[Dict[str, Any]]:
    """List all uploaded files with their parent_ids and basic metadata."""
    try:
        files_info = []
        
        # Get all versions to extract unique parent_ids and file info
        all_versions = version_manager._load_metadata()["versions"]
        parent_ids_seen = set()
        
        for version_data in all_versions:
            parent_id = version_data["parent_id"]
            if parent_id not in parent_ids_seen and version_data.get("is_active", True):
                parent_ids_seen.add(parent_id)
                
                # Get the first version (original upload) and most recent version
                file_versions = [v for v in all_versions if v["parent_id"] == parent_id and v.get("is_active", True)]
                
                # Normalize datetime objects for proper comparison
                for version in file_versions:
                    version["created_at"] = normalize_datetime(version["created_at"])
                
                file_versions.sort(key=lambda x: x["created_at"])
                first_version = Version(**file_versions[0])
                most_recent_version = Version(**file_versions[-1])
                
                file_info = {
                    "parent_id": parent_id,
                    "original_filename": first_version.description or first_version.name,  # Use description as filename if available
                    "first_version_name": first_version.name,
                    "first_version_created": first_version.created_at,
                    "first_version_created_by": first_version.created_by,
                    "most_recent_version_name": most_recent_version.name,
                    "most_recent_version_created": most_recent_version.created_at,
                    "version_count": len(file_versions)
                }
                
                # Try to get column info from the most recent version's data
                if most_recent_version.data_path and os.path.exists(most_recent_version.data_path):
                    try:
                        sample_df = pd.read_csv(most_recent_version.data_path, nrows=1)
                        file_info["columns"] = sample_df.columns.tolist()
                        file_info["column_count"] = len(sample_df.columns)
                    except Exception as e:
                        logger.warning(f"Error reading columns for file {parent_id}: {str(e)}")
                        file_info["columns"] = []
                        file_info["column_count"] = 0
                else:
                    file_info["columns"] = []
                    file_info["column_count"] = 0
                
                files_info.append(file_info)
        
        # Sort by creation date (newest first) - normalize datetime before comparison
        files_info.sort(key=lambda x: normalize_datetime(x["first_version_created"]), reverse=True)
        return files_info
        
    except Exception as e:
        logger.error(f"Error fetching file list: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching file list")

@app.get("/files/check")
async def check_for_existing_files() -> Dict[str, Any]:
    """Check if there are any existing files in the system."""
    try:
        all_versions = version_manager._load_metadata()["versions"]
        
        # Check if there are any active files
        active_files = set()
        for version_data in all_versions:
            if version_data.get("is_active", True):
                active_files.add(version_data["parent_id"])
        
        return {
            "has_existing_files": len(active_files) > 0,
            "file_count": len(active_files)
        }
        
    except Exception as e:
        logger.error(f"Error checking for existing files: {str(e)}")
        return {
            "has_existing_files": False,
            "file_count": 0
        }

@app.post("/files/{parent_id}/activate")
async def activate_file(parent_id: str) -> Dict[str, Any]:
    """Activate a file by its parent_id (load the most recent version of that file)."""
    try:
        # Get all versions for this parent_id
        versions = version_manager.list_versions(parent_id)
        if not versions:
            raise HTTPException(status_code=404, detail="No versions found for this file")
        
        # Get the most recent version
        most_recent_version = versions[0]  # Already sorted by date descending
        
        # Activate it
        if not most_recent_version.data_path or not os.path.exists(most_recent_version.data_path):
            raise HTTPException(status_code=404, detail="Version data file not found")
        
        # Copy the snapshot CSV to the main data file location
        shutil.copy2(most_recent_version.data_path, settings.get_data_path())
        
        # Restore metadata state
        metadata = {
            "columns": pd.read_csv(most_recent_version.data_path).columns.tolist(),
            "row_count": sum(1 for _ in open(most_recent_version.data_path)) - 1,
            "column_types": pd.read_csv(most_recent_version.data_path, nrows=1).dtypes.astype(str).to_dict(),
            "sample_data": pd.read_csv(most_recent_version.data_path, nrows=5).to_dict(orient="records"),
            "column_classifications": most_recent_version.metadata_state["column_classifications"],
            "dimension_flags": most_recent_version.metadata_state["dimension_flags"]
        }
        with open(settings.get_metadata_path(), "w") as f:
            json.dump(metadata, f)
        
        return {
            "success": True,
            "parent_id": parent_id,
            "activated_version": most_recent_version.model_dump(),
            "metadata": metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error activating file: {str(e)}")

@app.delete("/files/{parent_id}")
async def delete_file(parent_id: str) -> Dict[str, Any]:
    """Delete a file and all its versions."""
    try:
        # Get all versions for this parent_id
        versions = version_manager.list_versions(parent_id)
        if not versions:
            raise HTTPException(status_code=404, detail="No versions found for this file")
        
        # Delete all versions
        deleted_count = 0
        for version in versions:
            success = version_manager.delete_version(version.id)
            if success:
                deleted_count += 1
        
        return {
            "success": True,
            "parent_id": parent_id,
            "deleted_versions": deleted_count,
            "message": f"Successfully deleted file and {deleted_count} version(s)"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@app.get("/storage/usage")
async def get_storage_usage() -> Dict[str, Any]:
    """Get disk usage statistics for all files and versions."""
    try:
        usage_stats = version_manager.get_disk_usage_stats()
        
        # Format sizes for better readability
        def format_size(size_bytes: int) -> Dict[str, Any]:
            """Convert bytes to human readable format."""
            if size_bytes == 0:
                return {"bytes": 0, "readable": "0 B"}
            
            size_names = ["B", "KB", "MB", "GB", "TB"]
            size = size_bytes
            i = 0
            while size >= 1024 and i < len(size_names) - 1:
                size /= 1024.0
                i += 1
            
            return {
                "bytes": size_bytes,
                "readable": f"{size:.1f} {size_names[i]}"
            }
        
        # Format the response with readable sizes
        formatted_stats = {
            "total_size": format_size(usage_stats["total_size"]),
            "total_files": usage_stats["total_files"],
            "total_versions": usage_stats["total_versions"],
            "file_breakdown": {}
        }
        
        for parent_id, file_stats in usage_stats["file_stats"].items():
            formatted_stats["file_breakdown"][parent_id] = {
                "total_size": format_size(file_stats["total_size"]),
                "version_count": file_stats["version_count"],
                "versions": [
                    {
                        "version_id": version["version_id"],
                        "name": version["name"],
                        "size": format_size(version["size"]),
                        "created_at": version["created_at"]
                    }
                    for version in file_stats["versions"]
                ]
            }
        
        return formatted_stats
        
    except Exception as e:
        logger.error(f"Error getting storage usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving storage usage information") 