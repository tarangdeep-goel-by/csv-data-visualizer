import pytest
import httpx
import pandas as pd
import os
from pathlib import Path
import json
import sys
from fastapi.testclient import TestClient
import io
from fastapi import HTTPException

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))
from app.main import app, classify_columns

# Create a test client
client = TestClient(app)

# Test data with more variety for comprehensive testing
TEST_CSV_DATA = """date,category,subcategory,value,metric,special col!
2024-01-01,A,X,10,100,val1
2024-01-01,A,Y,20,200,val2
2024-01-01,B,X,15,150,val3
2024-01-01,B,Y,25,250,val4
2024-01-02,A,X,12,120,val5
2024-01-02,A,Y,22,220,val6
2024-01-02,B,X,18,180,val7
2024-01-02,B,Y,28,280,val8"""

# Edge case test data
EDGE_CASE_CSV = """date,category,value,metric
2024-01-01,A,10.123,100.456
,,NaN,
2024-01-02,C,,200"""

@pytest.fixture
def test_csv_file(tmp_path):
    """Create a temporary CSV file for testing."""
    file_path = tmp_path / "test.csv"
    with open(file_path, "w") as f:
        f.write(TEST_CSV_DATA)
    return file_path

@pytest.fixture
def edge_case_csv_file(tmp_path):
    """Create a temporary CSV file with edge cases."""
    file_path = tmp_path / "edge_case.csv"
    with open(file_path, "w") as f:
        f.write(EDGE_CASE_CSV)
    return file_path

@pytest.fixture
def uploaded_file(test_csv_file):
    """Upload a test file and return the response."""
    with open(test_csv_file, "rb") as f:
        client.post("/upload", files={"file": ("test.csv", f, "text/csv")})
    return test_csv_file

@pytest.mark.asyncio
async def test_update_classifications(uploaded_file):
    """Test updating column classifications."""
    classifications = {
        "dimensions": ["date", "category", "subcategory"],
        "metrics": ["value", "metric"]
    }
    response = client.put("/metadata/classifications", json=classifications)
    assert response.status_code == 200
    data = response.json()
    assert data["column_classifications"] == classifications

@pytest.mark.asyncio
async def test_error_invalid_file_format():
    """Test uploading invalid file format."""
    content = b"Invalid,Data\n1,2,3\n4,5,6"  # Invalid CSV format
    response = client.post(
        "/upload",
        files={"file": ("test.txt", io.BytesIO(content), "text/plain")}
    )
    assert response.status_code == 400
    assert "only csv files are supported" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_error_invalid_column(uploaded_file):
    """Test filtering with non-existent column."""
    filter_request = {
        "dimensions": ["non_existent_column"],
        "metrics": ["value"],
        "filters": []
    }
    response = client.post("/data/filter", json=filter_request)
    assert response.status_code == 400
    assert "Invalid columns requested" in response.json()["detail"]

@pytest.mark.asyncio
async def test_error_invalid_filter(uploaded_file):
    """Test invalid filter configuration."""
    filter_request = {
        "dimensions": ["date"],
        "metrics": ["value"],
        "filters": [
            {
                "column": "metric",  # Use existing column
                "filter": {
                    "type": "range",
                    "min": 100,
                    "max": 50  # Invalid range
                }
            }
        ]
    }
    response = client.post("/data/filter", json=filter_request)
    assert response.status_code == 400
    assert "min value cannot be greater than max value" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_edge_case_empty_data(edge_case_csv_file):
    """Test handling of empty/null values in data."""
    with open(edge_case_csv_file, "rb") as f:
        response = client.post("/upload", files={"file": ("edge_case.csv", f, "text/csv")})
    assert response.status_code == 200
    
    # Test filtering with null values
    filter_request = {
        "dimensions": ["category"],
        "metrics": ["value", "metric"],
        "filters": []
    }
    response = client.post("/data/filter", json=filter_request)
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) > 0

@pytest.mark.asyncio
async def test_edge_case_special_characters(uploaded_file):
    """Test handling of special characters in column names."""
    filter_request = {
        "dimensions": ["special col!"],  # Use the column with special characters
        "metrics": ["value"],
        "filters": []
    }
    response = client.post("/data/filter", json=filter_request)
    assert response.status_code == 200
    data = response.json()
    assert any("special col!" in row for row in data["data"])

@pytest.mark.asyncio
async def test_complex_filter_combination(uploaded_file):
    """Test complex combination of filters."""
    # Upload test file first to ensure data is available
    filter_request = {
        "dimensions": ["date", "category", "subcategory"],
        "metrics": ["value", "metric"],
        "filters": [
            {
                "column": "category",
                "filter": {
                    "type": "value",
                    "values": ["A"]
                }
            },
            {
                "column": "metric",  # Use metric instead of value for range filter
                "filter": {
                    "type": "range",
                    "min": 150,
                    "max": 250
                }
            },
            {
                "column": "subcategory",
                "filter": {
                    "type": "value",
                    "values": ["Y"]
                }
            }
        ],
        "visualization_metrics": ["value", "metric"]
    }
    response = client.post("/data/filter", json=filter_request)
    assert response.status_code == 200
    data = response.json()
    
    # Verify filtered data meets all conditions
    for row in data["data"]:
        assert row["category"] == "A"
        assert row["subcategory"] == "Y"
        assert 150 <= row["metric"] <= 250

@pytest.mark.asyncio
async def test_multiple_metric_aggregation(uploaded_file):
    """Test aggregation of multiple metrics with grouping."""
    filter_request = {
        "dimensions": ["category"],
        "metrics": ["value", "metric"],
        "filters": [],
        "visualization_metrics": ["value", "metric"]
    }
    response = client.post("/data/filter", json=filter_request)
    assert response.status_code == 200
    data = response.json()
    
    # Verify both metrics are aggregated
    vis_data = data["visualization_data"]
    assert len(vis_data) > 0
    assert all(metric in vis_data[0] for metric in ["value", "metric"])

@pytest.mark.asyncio
async def test_download_filtered_with_nulls(edge_case_csv_file):
    """Test downloading filtered data with null values."""
    with open(edge_case_csv_file, "rb") as f:
        client.post("/upload", files={"file": ("edge_case.csv", f, "text/csv")})
    
    filter_request = {
        "dimensions": ["date", "category"],
        "metrics": ["value", "metric"],
        "filters": []
    }
    response = client.post("/download/filtered", json=filter_request)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    
    # Parse the CSV content
    content = response.content.decode('utf-8')
    df = pd.read_csv(io.StringIO(content))
    assert not df.empty
    assert df.isnull().any().any()  # Verify null values are preserved

@pytest.mark.asyncio
async def test_column_classification_errors():
    """Test error handling in column classification."""
    from app.main import classify_columns
    
    # Test with empty DataFrame
    df = pd.DataFrame()
    with pytest.raises(HTTPException) as exc_info:
        await classify_columns(df)
    assert exc_info.value.status_code == 400
    assert "File is empty" in exc_info.value.detail
    
    # Test with DataFrame containing non-numeric metrics
    df = pd.DataFrame({
        'date': ['2024-01-01', '2024-01-02'],
        'value': ['abc', 'def']  # String values that should be numeric
    })
    with pytest.raises(HTTPException) as exc_info:
        await classify_columns(df)
    assert exc_info.value.status_code == 400
    assert "Error processing file" in exc_info.value.detail

@pytest.mark.asyncio
async def test_metadata_handling():
    """Test metadata handling functionality."""
    # First, ensure no metadata exists
    metadata_path = os.path.join("data", "metadata.json")
    if os.path.exists(metadata_path):
        os.remove(metadata_path)
    
    # Test getting metadata when no file exists
    response = client.get("/metadata")
    assert response.status_code == 200
    assert response.json() == {"error": "No metadata found"}

    # Create a test file and upload it
    test_data = pd.DataFrame({
        'date': ['2024-01-01', '2024-01-02'],
        'category': ['A', 'B'],
        'value': [10, 20]
    })
    os.makedirs("data", exist_ok=True)
    test_data.to_csv("data/original_data.csv", index=False)
    
    # Upload the file to create metadata
    with open("data/original_data.csv", "rb") as f:
        response = client.post("/upload", files={"file": ("test.csv", f, "text/csv")})
    assert response.status_code == 200

    # Test updating classifications with invalid data
    invalid_classifications = {
        "dimensions": ["non_existent_column"],
        "metrics": ["value"]
    }
    response = client.put("/metadata/classifications", json=invalid_classifications)
    assert response.status_code == 400
    assert "some columns do not exist" in response.json()["detail"]

    # Test updating dimension flags with invalid data
    invalid_flags = {
        "index_dimension": "non_existent_column",
        "time_dimension": None
    }
    response = client.put("/metadata/dimension-flags", json=invalid_flags)
    assert response.status_code == 400
    assert "column does not exist" in response.json()["detail"]

@pytest.mark.asyncio
async def test_filter_processing():
    """Test filter data processing functionality."""
    # Test with invalid filter column
    filter_request = {
        "dimensions": ["date"],
        "metrics": ["value"],
        "filters": [
            {
                "column": "non_existent_column",
                "filter": {
                    "type": "value",
                    "values": ["2024-01-01"]
                }
            }
        ]
    }
    response = client.post("/data/filter", json=filter_request)
    assert response.status_code == 400
    assert "Invalid filter: column 'non_existent_column' does not exist" in response.json()["detail"]

    # Test with invalid range filter
    filter_request = {
        "dimensions": ["date"],
        "metrics": ["value"],
        "filters": [
            {
                "column": "value",
                "filter": {
                    "type": "range",
                    "min": 100,
                    "max": 50  # Invalid range
                }
            }
        ]
    }
    response = client.post("/data/filter", json=filter_request)
    assert response.status_code == 400
    assert "min value cannot be greater than max value" in response.json()["detail"]

@pytest.mark.asyncio
async def test_visualization_logic():
    """Test data visualization logic."""
    # Test comparison view with multiple values
    filter_request = {
        "dimensions": ["date", "category"],
        "metrics": ["value"],
        "filters": [
            {
                "column": "category",
                "filter": {
                    "type": "value",
                    "values": ["A", "B"]
                }
            }
        ],
        "visualization_metrics": ["value"]
    }
    response = client.post("/data/filter", json=filter_request)
    assert response.status_code == 200
    data = response.json()
    assert "visualization_data" in data
    assert len(data["visualization_data"]) > 0
    assert any("value (category: A)" in row for row in data["visualization_data"])
    assert any("value (category: B)" in row for row in data["visualization_data"])

    # Test regular aggregation view
    filter_request = {
        "dimensions": ["date"],
        "metrics": ["value"],
        "filters": [],
        "visualization_metrics": ["value"]
    }
    response = client.post("/data/filter", json=filter_request)
    assert response.status_code == 200
    data = response.json()
    assert "visualization_data" in data
    assert len(data["visualization_data"]) > 0
    assert all("value" in row for row in data["visualization_data"])

@pytest.mark.asyncio
async def test_download_functionality():
    """Test data download functionality."""
    # Test downloading filtered data
    filter_request = {
        "dimensions": ["date"],
        "metrics": ["value"],
        "filters": [
            {
                "column": "value",
                "filter": {
                    "type": "range",
                    "min": 10,
                    "max": 20
                }
            }
        ]
    }
    response = client.post("/download/filtered", json=filter_request)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]

    # Test downloading with invalid columns
    filter_request = {
        "dimensions": ["non_existent_column"],
        "metrics": ["value"],
        "filters": []
    }
    response = client.post("/download/filtered", json=filter_request)
    assert response.status_code == 400
    assert "Invalid columns requested" in response.json()["detail"]

    # Test downloading with no data file
    os.remove("data/original_data.csv")
    response = client.post("/download/filtered", json=filter_request)
    assert response.status_code == 404
    assert "No data file found" in response.json()["detail"]

@pytest.mark.asyncio
async def test_unique_values_endpoint():
    """Test the unique values endpoint."""
    # Ensure data file exists
    file_path = os.path.join("data", "original_data.csv")
    if not os.path.exists(file_path):
        df = pd.DataFrame({
            'date': ['2024-01-01', '2024-01-02'],
            'category': ['A', 'B'],
            'value': [10, 20]
        })
        os.makedirs("data", exist_ok=True)
        df.to_csv(file_path, index=False)
    
    # Test getting unique values for a column
    filter_request = {
        "dimensions": ["date"],
        "metrics": ["value"],
        "filters": []
    }
    response = client.post("/data/unique-values/category", json=filter_request)
    assert response.status_code == 200
    data = response.json()
    assert "values" in data
    assert len(data["values"]) > 0

    # Test with non-existent column
    response = client.post("/data/unique-values/non_existent_column", json=filter_request)
    assert response.status_code == 400
    assert "Column not found" in response.json()["detail"]

    # Test with filtered data
    filter_request = {
        "dimensions": ["date"],
        "metrics": ["value"],
        "filters": [
            {
                "column": "value",
                "filter": {
                    "type": "range",
                    "min": 10,
                    "max": 20
                }
            }
        ]
    }
    response = client.post("/data/unique-values/category", json=filter_request)
    assert response.status_code == 200
    data = response.json()
    assert "values" in data
    assert len(data["values"]) > 0