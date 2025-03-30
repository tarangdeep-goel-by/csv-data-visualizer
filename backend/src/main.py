from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import StringIO
import csv
from typing import List, Dict, Any
from .errors.exceptions import (
    EmptyFileError,
    InvalidFileTypeError,
    BrokenFileError,
    NoColumnsIdentifiedError,
    NoDimensionsError,
    NoMetricsError
)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def round_numeric_values(df: pd.DataFrame, metrics: List[str]) -> pd.DataFrame:
    """Round numeric values in metric columns to 2 decimal places."""
    df_copy = df.copy()
    for column in metrics:
        if column in df_copy.columns and df_copy[column].dtype in ['float64', 'float32']:
            df_copy[column] = df_copy[column].round(2)
    return df_copy

def validate_csv_file(file: UploadFile) -> None:
    # Check file type
    if not file.filename.lower().endswith('.csv'):
        raise InvalidFileTypeError()
    
    # Read first few bytes to check if file is empty
    first_bytes = file.file.read(1024)
    if not first_bytes:
        raise EmptyFileError()
    
    # Reset file pointer
    file.file.seek(0)
    
    # Try to read the first row to validate CSV format
    try:
        content = first_bytes.decode()
        csv.Sniffer().sniff(content)
    except (csv.Error, UnicodeDecodeError):
        raise BrokenFileError()

@app.post("/upload")
async def upload_file(file: UploadFile):
    try:
        # Validate file
        validate_csv_file(file)
        
        # Read CSV file
        content = await file.read()
        df = pd.read_csv(StringIO(content.decode()))
        
        if df.empty or len(df.columns) == 0:
            raise NoColumnsIdentifiedError()
        
        # Your existing logic for column classification
        dimensions = []
        metrics = []
        
        for column in df.columns:
            if df[column].dtype in ['int64', 'float64'] and df[column].nunique() / len(df) > 0.1:
                metrics.append(column)
            else:
                dimensions.append(column)
        
        if not metrics:
            raise NoMetricsError()
        
        # Get column types
        column_types = {col: str(df[col].dtype) for col in df.columns}
        
        # Round numeric values in sample data
        df_rounded = round_numeric_values(df, metrics)
        sample_data = df_rounded.head().to_dict('records')

        # If no dimensions identified, use the first non-metric column as index
        index_dimension = None
        if dimensions:
            index_dimension = dimensions[0]
        else:
            # Use the first non-metric column as index
            non_metric_columns = [col for col in df.columns if col not in metrics]
            if non_metric_columns:
                index_dimension = non_metric_columns[0]
                dimensions.append(index_dimension)
            else:
                # If no non-metric columns, use the first column as index
                index_dimension = df.columns[0]
                dimensions.append(index_dimension)
        
        # Save the original file with rounded values
        df_rounded.to_csv("data/original_data.csv", index=False)
        
        return {
            "columns": list(df.columns),
            "row_count": len(df),
            "column_types": column_types,
            "sample_data": sample_data,
            "column_classifications": {
                "dimensions": dimensions,
                "metrics": metrics
            },
            "dimension_flags": {
                "index_dimension": index_dimension,
                "time_dimension": None
            }
        }
        
    except (EmptyFileError, InvalidFileTypeError, BrokenFileError, 
            NoColumnsIdentifiedError, NoMetricsError) as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/data/filter")
async def filter_data(request: FilterRequest):
    try:
        df = pd.read_csv("data/original_data.csv")
        
        # Apply filters if any
        if request.filters:
            for column, value in request.filters.items():
                if isinstance(value, list):
                    df = df[df[column].isin(value)]
                elif isinstance(value, dict):
                    if 'min' in value:
                        df = df[df[column] >= value['min']]
                    if 'max' in value:
                        df = df[df[column] <= value['max']]
                else:
                    df = df[df[column] == value]
        
        # Select requested columns
        df = df[request.dimensions + request.metrics]
        
        # Group by dimensions if any
        if request.dimensions:
            aggs = {metric: 'sum' for metric in request.metrics}
            df = df.groupby(request.dimensions, as_index=False).agg(aggs)
        
        # Round numeric values
        df = round_numeric_values(df, request.metrics)
        
        return {
            "data": df.to_dict(orient="records"),
            "total_rows": len(df)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FilterRequest(BaseModel):
    dimensions: List[str]
    metrics: List[str]
    filters: Dict[str, Any] = {} 