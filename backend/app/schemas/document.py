from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.transaction import TransactionCreate

class DocumentResponse(BaseModel):
    id: int
    original_filename: str
    stored_filename: str
    file_type: str
    file_size: int
    upload_date: datetime
    parsed: str
    parsed_count: int
    uploaded_by: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ParsedTransaction(BaseModel):
    transaction_date: datetime
    amount: float
    transaction_type: str
    category: str
    description: str
    reference_number: Optional[str] = None
    resident_unit: Optional[str] = None

class DocumentImportRequest(BaseModel):
    transactions: List[TransactionCreate]
