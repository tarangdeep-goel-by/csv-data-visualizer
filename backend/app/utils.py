from typing import Dict, List, Any
import pandas as pd
from fastapi import HTTPException
from .models import ColumnFilter

def classify_columns(df: pd.DataFrame) -> Dict[str, List[str]]:
    """Classify columns as dimensions (string) or metrics (numeric)."""
    if df.empty:
        raise HTTPException(status_code=400, detail="Invalid CSV file: File is empty")
    
    dimensions = []
    metrics = []
    
    try:
        for column in df.columns:
            # Check if column is numeric and has at least one non-null value
            if pd.api.types.is_numeric_dtype(df[column]) and df[column].notna().any():
                metrics.append(column)
            else:
                dimensions.append(column)
                
        if not metrics:
            raise HTTPException(status_code=400, detail="Error processing file: No numeric metrics found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    
    return {
        "dimensions": dimensions,
        "metrics": metrics
    }

def get_default_index_dimension(dimensions: List[str]) -> str:
    """Get the first dimension as the default index dimension."""
    return dimensions[0] if dimensions else None

def aggregate_data(df: pd.DataFrame, dimensions: List[str], metrics: List[str]) -> pd.DataFrame:
    """Aggregate data based on specified dimensions and metrics."""
    if not dimensions or df.empty:
        return df
    
    agg_dict = {metric: 'sum' for metric in metrics}
    result = df.groupby(dimensions, dropna=False).agg(agg_dict).reset_index()
    return result

def apply_filters(df: pd.DataFrame, filters: List[ColumnFilter]) -> pd.DataFrame:
    """Apply filters to the dataframe."""
    if not filters:
        return df
    
    df_copy = df.copy()
    
    for filter_item in filters:
        column = filter_item.column
        filter_data = filter_item.filter
        
        if column not in df_copy.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid filter: column '{column}' does not exist"
            )
        
        if filter_data.type == "value":
            mask = df_copy[column].isin(filter_data.values)
            df_copy = df_copy[mask | df_copy[column].isna()]  # Keep null values
        elif filter_data.type == "range":
            if filter_data.min > filter_data.max:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid range filter for column '{column}': min value cannot be greater than max value"
                )
            mask = (df_copy[column] >= filter_data.min) & (df_copy[column] <= filter_data.max)
            df_copy = df_copy[mask | df_copy[column].isna()]  # Keep null values
    
    return df_copy

def round_numeric_values(df: pd.DataFrame) -> pd.DataFrame:
    """Round numeric values to 2 decimal places."""
    df_copy = df.copy()
    numeric_columns = df_copy.select_dtypes(include=['float64', 'int64']).columns
    for column in numeric_columns:
        df_copy[column] = df_copy[column].round(2)
    return df_copy

def validate_column_classifications(columns: List[str], classifications: Dict[str, List[str]]) -> None:
    """Validate column classifications."""
    if not all(key in classifications for key in ["dimensions", "metrics"]):
        raise HTTPException(
            status_code=400,
            detail="Invalid classifications: must include both 'dimensions' and 'metrics'"
        )
    
    all_columns = set(columns)
    provided_columns = set(classifications["dimensions"] + classifications["metrics"])
    
    if not provided_columns.issubset(all_columns):
        raise HTTPException(
            status_code=400,
            detail="Invalid classifications: some columns do not exist in the dataset"
        )
    
    if len(provided_columns) != len(classifications["dimensions"]) + len(classifications["metrics"]):
        raise HTTPException(
            status_code=400,
            detail="Invalid classifications: columns must be classified exactly once"
        ) 