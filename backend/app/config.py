from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATA_DIR: str = "data"
    ALLOWED_ORIGINS: list = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]
    METADATA_FILENAME: str = "metadata.json"
    DATA_FILENAME: str = "original_data.csv"
    
    def get_data_path(self) -> str:
        return os.path.join(self.DATA_DIR, self.DATA_FILENAME)
    
    def get_metadata_path(self) -> str:
        return os.path.join(self.DATA_DIR, self.METADATA_FILENAME)

settings = Settings() 