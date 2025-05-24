from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel
from datetime import datetime

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

class Version(BaseModel):
    """Model for storing version information."""
    id: str  # UUID
    parent_id: str  # UUID of the original upload
    name: str
    description: Optional[str] = None
    created_at: datetime
    created_by: str  # User identifier
    filter_criteria: FilterRequest  # Current filters at time of save
    metadata_state: Dict[str, Any]  # Stores classifications and dimension flags
    is_active: bool = True
    data_path: Optional[str] = None

class SaveVersionRequest(BaseModel):
    filter_criteria: FilterRequest
    name: str
    description: Optional[str] = None
    created_by: str = "default_user" 