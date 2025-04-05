from typing import List, Optional, Union
from pydantic import BaseModel

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