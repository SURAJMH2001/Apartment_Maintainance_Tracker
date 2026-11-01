import os

base_dir = r"d:\Apartment_Mainatainance_Tracker\backend"

files = {
    "app/api/__init__.py": "",
    "app/api/v1/__init__.py": "",
    "app/api/v1/auth.py": """from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.schemas.auth import Token, UserResponse, UserCreate
from app.models.user import User
from app.core.dependencies import get_current_user

router = APIRouter()

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}
""",
    "app/api/v1/residents.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.resident import ResidentCreate, ResidentUpdate, ResidentResponse
from app.repositories.resident_repository import resident_repo
from app.core.dependencies import get_current_user, get_current_manager_or_admin
from app.services.audit_service import AuditService

router = APIRouter()

@router.get("", response_model=List[ResidentResponse])
def get_residents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return resident_repo.get_all(db, skip=skip, limit=limit)

@router.post("", response_model=ResidentResponse)
def create_resident(resident_in: ResidentCreate, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    resident = resident_repo.create(db, resident_in.model_dump())
    AuditService.log_action(db, current_user.id, current_user.username, "CREATE", "Resident", resident.id, new_values=resident_in.model_dump())
    return resident

@router.get("/{id}", response_model=ResidentResponse)
def get_resident(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    resident = resident_repo.get(db, id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    return resident

@router.put("/{id}", response_model=ResidentResponse)
def update_resident(id: int, resident_in: ResidentUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    resident = resident_repo.get(db, id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    old_data = {k: getattr(resident, k) for k in resident_in.model_dump(exclude_unset=True).keys()}
    resident = resident_repo.update(db, resident, resident_in.model_dump(exclude_unset=True))
    AuditService.log_action(db, current_user.id, current_user.username, "UPDATE", "Resident", resident.id, old_values=old_data, new_values=resident_in.model_dump(exclude_unset=True))
    return resident

@router.delete("/{id}")
def delete_resident(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    resident = resident_repo.get(db, id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    resident_repo.delete(db, id)
    AuditService.log_action(db, current_user.id, current_user.username, "DELETE", "Resident", id)
    return {"message": "Resident deleted"}

@router.get("/{id}/payments")
def get_resident_payments(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    from app.models.payment import Payment
    return db.query(Payment).filter(Payment.resident_id == id).all()

@router.get("/{id}/transactions")
def get_resident_transactions(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    from app.models.transaction import Transaction
    return db.query(Transaction).filter(Transaction.resident_id == id).all()
""",
    "app/api/v1/transactions.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.repositories.transaction_repository import transaction_repo
from app.core.dependencies import get_current_user, get_current_manager_or_admin
from app.services.audit_service import AuditService

router = APIRouter()

@router.get("", response_model=List[TransactionResponse])
def get_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return transaction_repo.get_all(db, skip=skip, limit=limit)

@router.post("", response_model=TransactionResponse)
def create_transaction(transaction_in: TransactionCreate, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    data = transaction_in.model_dump()
    data["created_by"] = current_user.id
    transaction = transaction_repo.create(db, data)
    AuditService.log_action(db, current_user.id, current_user.username, "CREATE", "Transaction", transaction.id, new_values=data)
    return transaction

@router.get("/{id}", response_model=TransactionResponse)
def get_transaction(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    transaction = transaction_repo.get(db, id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@router.put("/{id}", response_model=TransactionResponse)
def update_transaction(id: int, transaction_in: TransactionUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    transaction = transaction_repo.get(db, id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    updated = transaction_repo.update(db, transaction, transaction_in.model_dump(exclude_unset=True))
    AuditService.log_action(db, current_user.id, current_user.username, "UPDATE", "Transaction", transaction.id)
    return updated

@router.delete("/{id}")
def delete_transaction(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    transaction = transaction_repo.get(db, id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    transaction_repo.delete(db, id)
    AuditService.log_action(db, current_user.id, current_user.username, "DELETE", "Transaction", id)
    return {"message": "Transaction deleted"}
""",
    "app/api/v1/documents.py": """from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
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
""",
    "app/api/v1/payments.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date, timezone
from app.core.database import get_db
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse
from app.repositories.payment_repository import payment_repo
from app.repositories.resident_repository import resident_repo
from app.models.alert import Alert
from app.core.dependencies import get_current_user, get_current_manager_or_admin
from app.services.audit_service import AuditService

router = APIRouter()

@router.get("", response_model=List[PaymentResponse])
def get_payments(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return payment_repo.get_all(db)

@router.put("/{id}", response_model=PaymentResponse)
def update_payment(id: int, payment_in: PaymentUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    payment = payment_repo.get(db, id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment = payment_repo.update(db, payment, payment_in.model_dump(exclude_unset=True))
    AuditService.log_action(db, current_user.id, current_user.username, "UPDATE", "Payment", payment.id)
    return payment

@router.post("/generate-monthly")
def generate_monthly_payments(month: str, due_date: date, due_amount: float, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    residents = resident_repo.get_all(db)
    generated = 0
    for resident in residents:
        if not resident.is_active: continue
        existing = payment_repo.get_by_resident_and_month(db, resident.id, month)
        if not existing:
            payment_repo.create(db, {
                "resident_id": resident.id,
                "month": month,
                "due_amount": due_amount,
                "due_date": due_date,
                "status": "pending"
            })
            generated += 1
    AuditService.log_action(db, current_user.id, current_user.username, "CREATE", "Payment", "batch", new_values={"month": month, "count": generated})
    return {"message": f"Generated {generated} payments for {month}"}

@router.post("/check-overdue")
def check_overdue(db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    payments = payment_repo.get_all(db)
    today = datetime.now(timezone.utc).date()
    alerts_created = 0
    for payment in payments:
        if payment.status in ["pending", "partial"] and payment.due_date < today:
            payment.status = "overdue"
            db.commit()
            
            existing_alert = db.query(Alert).filter(Alert.resident_id == payment.resident_id, Alert.alert_type == "overdue_payment", Alert.is_resolved == False).first()
            if not existing_alert:
                alert = Alert(
                    alert_type="overdue_payment",
                    severity="warning",
                    title="Overdue Payment",
                    message=f"Payment overdue for month {payment.month}",
                    resident_id=payment.resident_id
                )
                db.add(alert)
                db.commit()
                alerts_created += 1
    return {"message": f"Checked overdue. {alerts_created} alerts created."}
""",
    "app/api/v1/alerts.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.core.database import get_db
from app.schemas.alert import AlertResponse
from app.models.alert import Alert
from app.core.dependencies import get_current_user, get_current_manager_or_admin

router = APIRouter()

@router.get("", response_model=List[AlertResponse])
def get_alerts(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Alert).order_by(Alert.created_at.desc()).all()

@router.put("/{id}/resolve", response_model=AlertResponse)
def resolve_alert(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolved_by = current_user.id
    db.commit()
    db.refresh(alert)
    return alert
""",
    "app/api/v1/dashboard.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.resident import Resident
from app.models.payment import Payment
from app.models.alert import Alert
from app.models.transaction import Transaction
from app.core.dependencies import get_current_user
from app.schemas.dashboard import DashboardSummary, DashboardTrend, DashboardCategoryBreakdown

router = APIRouter()

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    total_residents = db.query(Resident).filter(Resident.is_active == True).count()
    total_pending_dues = db.query(func.sum(Payment.due_amount - Payment.paid_amount)).filter(Payment.status.in_(["pending", "partial", "overdue"])).scalar() or 0.0
    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
    return DashboardSummary(
        total_residents=total_residents,
        total_pending_dues=total_pending_dues,
        monthly_collection_rate=85.5, # Placeholder for simplicity
        active_alerts=active_alerts
    )

@router.get("/monthly-trend")
def get_monthly_trend(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return {"trends": [{"month": "2023-01", "income": 50000, "expense": 45000}]}

@router.get("/category-breakdown")
def get_category_breakdown(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    breakdown = db.query(Transaction.category, func.sum(Transaction.amount)).filter(Transaction.transaction_type == "expense").group_by(Transaction.category).all()
    return {"breakdown": [{"category": b[0], "amount": b[1]} for b in breakdown]}

@router.get("/top-defaulters")
def get_top_defaulters(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return []
""",
    "app/api/v1/reports.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter()

@router.get("/monthly-summary")
def get_monthly_summary(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return []

@router.get("/resident-collection")
def get_resident_collection(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return []

@router.get("/expense-breakdown")
def get_expense_breakdown(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return []
""",
    "app/api/v1/audit.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogResponse
from app.core.dependencies import get_current_active_admin

router = APIRouter()

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_active_admin)):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
""",
    "app/api/v1/router.py": """from fastapi import APIRouter
from app.api.v1 import auth, residents, transactions, documents, payments, alerts, dashboard, reports, audit

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(residents.router, prefix="/residents", tags=["residents"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
""",
    "app/main.py": """from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import get_settings
from app.api.v1.router import api_router
from app.core.database import Base, engine

settings = get_settings()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok"}
""",
    "seed.py": """import os
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.resident import Resident
from app.models.transaction import Transaction
from app.models.payment import Payment
from app.models.alert import Alert
from app.core.security import get_password_hash

def seed_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 1. Admin User
    admin = User(username="admin", email="admin@test.com", hashed_password=get_password_hash("Admin@123"), role="admin")
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    # 2. Residents
    residents = []
    for i in range(1, 11):
        r = Resident(unit_number=f"A-{100+i}", floor=1, owner_name=f"Owner {i}", owner_email=f"owner{i}@test.com", owner_phone=f"123456789{i%10}")
        db.add(r)
        residents.append(r)
    db.commit()
    
    # 3. Transactions & Payments
    today = datetime.now(timezone.utc).date()
    for r in residents:
        p = Payment(resident_id=r.id, month="2023-10", due_amount=3000, due_date=today - timedelta(days=5), status="overdue")
        db.add(p)
        t = Transaction(transaction_date=today, amount=100, transaction_type="expense", category="repair", description="Fix plumbing", created_by=admin.id)
        db.add(t)
    
    db.commit()
    
    # 4. Alerts
    a = Alert(alert_type="system", severity="info", title="System Started", message="Backend seeded successfully.")
    db.add(a)
    db.commit()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed_database()
""",
    "start.py": """import os
import shutil
import uvicorn
from app.core.database import Base, engine

def main():
    if not os.path.exists(".env") and os.path.exists(".env.example"):
        shutil.copy(".env.example", ".env")
        print("Created .env from .env.example")
        
    Base.metadata.create_all(bind=engine)
    
    print("Starting uvicorn server...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
"""
}

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
print("gen3 complete")
