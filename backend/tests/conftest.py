import pytest
import os
import shutil
from pathlib import Path

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Set up the test environment."""
    # Create a test data directory
    test_data_dir = Path("data")
    test_data_dir.mkdir(exist_ok=True)
    
    yield
    
    # Clean up after tests
    if test_data_dir.exists():
        shutil.rmtree(test_data_dir)

@pytest.fixture(autouse=True)
def cleanup_after_test():
    """Clean up after each test."""
    yield
    # Remove any test files created during the test
    test_data_dir = Path("data")
    if test_data_dir.exists():
        for file in test_data_dir.glob("test_*.csv"):
            file.unlink() 