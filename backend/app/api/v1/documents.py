from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.config import get_settings
from app.models.document import Document
from app.schemas.document import DocumentResponse, ParsedTransaction, DocumentImportRequest
from app.core.dependencies import get_current_manager_or_admin, get_current_user
from app.services.document_service import DocumentService
from app.services.audit_service import AuditService

router = APIRouter()
settings = get_settings()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split('.')[-1]
    stored_filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    doc = Document(
        original_filename=file.filename,
        stored_filename=stored_filename,
        file_type=file.content_type,
        file_size=os.path.getsize(file_path),
        upload_date=datetime.now(timezone.utc),
        uploaded_by=current_user.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    AuditService.log_action(db, current_user.id, current_user.username, "CREATE", "Document", doc.id)
    return doc

@router.get("", response_model=List[DocumentResponse])
def get_documents(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Document).all()

@router.post("/{id}/import", response_model=List[ParsedTransaction])
def import_document(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = os.path.join(settings.UPLOAD_DIR, doc.stored_filename)
    parser = DocumentService.get_parser(doc.file_type)
    transactions = parser.parse(file_path)
    
    doc.parsed = "true"
    doc.parsed_count = len(transactions)
    db.commit()
    AuditService.log_action(db, current_user.id, current_user.username, "UPDATE", "Document", doc.id, new_values={"parsed_count": len(transactions)})
    
    return transactions
