from fastapi import HTTPException, status

class FileValidationError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

class EmptyFileError(FileValidationError):
    def __init__(self):
        super().__init__("The uploaded file is empty")

class InvalidFileTypeError(FileValidationError):
    def __init__(self):
        super().__init__("Invalid file type. Please upload a CSV file")

class BrokenFileError(FileValidationError):
    def __init__(self):
        super().__init__("The file appears to be corrupted or in an invalid format")

class NoColumnsIdentifiedError(FileValidationError):
    def __init__(self):
        super().__init__("No valid columns could be identified in the file")

class NoDimensionsError(FileValidationError):
    def __init__(self):
        super().__init__("No dimension columns could be identified in the file")

class NoMetricsError(FileValidationError):
    def __init__(self):
        super().__init__("No metric columns could be identified in the file") 