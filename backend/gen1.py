import os

base_dir = r"d:\Apartment_Mainatainance_Tracker\backend"

files = {
    "requirements.txt": """fastapi==0.111.0
uvicorn[standard]==0.30.1
sqlalchemy==2.0.30
alembic==1.13.1
pydantic==2.7.1
pydantic-settings==2.3.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
slowapi==0.1.9
pdfplumber==0.11.0
python-docx==1.1.2
openpyxl==3.1.4
xlrd==2.0.1
pandas==2.2.2
python-dateutil==2.9.0
aiofiles==23.2.1
httpx==0.27.0
""",
    ".env.example": """SECRET_KEY=your-secret-key-here-change-in-production
DATABASE_URL=sqlite:///./maintenance_tracker.db
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
APP_NAME=Apartment Maintenance Tracker
APP_VERSION=1.0.0
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=10
DEFAULT_MAINTENANCE_AMOUNT=3000
DEFAULT_DUE_DATE_DAY=5
PENALTY_RATE=0.02
""",
    "app/__init__.py": "",
    "app/core/__init__.py": "",
    "app/core/config.py": """from pydantic_settings import BaseSettings
from functools import lru_cache
import json

class Settings(BaseSettings):
    SECRET_KEY: str = "your-secret-key-here"
    DATABASE_URL: str = "sqlite:///./maintenance_tracker.db"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_NAME: str = "Apartment Maintenance Tracker"
    APP_VERSION: str = "1.0.0"
    CORS_ORIGINS: str = '["http://localhost:5173", "http://localhost:3000"]'
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    DEFAULT_MAINTENANCE_AMOUNT: float = 3000.0
    DEFAULT_DUE_DATE_DAY: int = 5
    PENALTY_RATE: float = 0.02
    
    @property
    def cors_origins_list(self) -> list[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except:
            return ["*"]

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
""",
    "app/core/database.py": """from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
""",
    "app/core/security.py": """from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt
from passlib.context import CryptContext
from app.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: str | Any) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
""",
    "app/core/dependencies.py": """from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"/api/v1/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def get_current_active_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")
    return current_user

def get_current_manager_or_admin(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")
    return current_user
""",
    "app/models/__init__.py": "",
    "app/models/base.py": """from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime
from app.core.database import Base

class BaseModel(Base):
    __abstract__ = True
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
""",
    "app/models/user.py": """from sqlalchemy import Column, String, Boolean
from app.models.base import BaseModel

class User(BaseModel):
    __tablename__ = "users"
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="viewer") # admin, manager, viewer
    is_active = Column(Boolean, default=True)
""",
    "app/models/resident.py": """from sqlalchemy import Column, String, Boolean, Date
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Resident(BaseModel):
    __tablename__ = "residents"
    unit_number = Column(String, unique=True, index=True, nullable=False)
    floor = Column(Integer)
    owner_name = Column(String, nullable=False)
    owner_email = Column(String)
    owner_phone = Column(String)
    alternate_phone = Column(String)
    ownership_type = Column(String, default="owner") # owner, tenant
    move_in_date = Column(Date)
    is_active = Column(Boolean, default=True)
    notes = Column(String)
    
    payments = relationship("Payment", back_populates="resident", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="resident")
""",
    "app/models/transaction.py": """from sqlalchemy import Column, Float, String, Date, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Transaction(BaseModel):
    __tablename__ = "transactions"
    transaction_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String, nullable=False) # income, expense
    category = Column(String, nullable=False) # maintenance, utility, repair, salary, other
    description = Column(String)
    reference_number = Column(String)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    
    resident = relationship("Resident", back_populates="transactions")
    document = relationship("Document", back_populates="transactions")
""",
    "app/models/payment.py": """from sqlalchemy import Column, Float, String, Date, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Payment(BaseModel):
    __tablename__ = "payments"
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    month = Column(String, nullable=False) # YYYY-MM
    due_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    due_date = Column(Date, nullable=False)
    paid_date = Column(Date, nullable=True)
    status = Column(String, default="pending") # pending, partial, paid, overdue
    penalty_amount = Column(Float, default=0.0)
    payment_method = Column(String)
    notes = Column(String)
    
    resident = relationship("Resident", back_populates="payments")
""",
    "app/models/document.py": """from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Document(BaseModel):
    __tablename__ = "documents"
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False, unique=True)
    file_type = Column(String)
    file_size = Column(Integer)
    upload_date = Column(DateTime)
    parsed = Column(String, default="false") # boolean represented as str, or actual boolean
    parsed_count = Column(Integer, default=0)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    
    transactions = relationship("Transaction", back_populates="document")
""",
    "app/models/alert.py": """from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from app.models.base import BaseModel

class Alert(BaseModel):
    __tablename__ = "alerts"
    alert_type = Column(String, nullable=False) # overdue_payment, document_parsed, system
    severity = Column(String, default="info") # info, warning, critical
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
""",
    "app/models/audit_log.py": """from sqlalchemy import Column, String, Integer, JSON
from app.models.base import BaseModel

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"
    user_id = Column(Integer, nullable=True)
    username = Column(String, nullable=True)
    action = Column(String, nullable=False) # CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
""",
    "app/schemas/__init__.py": "",
    "app/schemas/auth.py": """from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str = "viewer"
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True
""",
    "app/schemas/resident.py": """from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

class ResidentBase(BaseModel):
    unit_number: str
    floor: Optional[int] = None
    owner_name: str
    owner_email: Optional[EmailStr] = None
    owner_phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    ownership_type: str = "owner"
    move_in_date: Optional[date] = None
    is_active: bool = True
    notes: Optional[str] = None

class ResidentCreate(ResidentBase):
    pass

class ResidentUpdate(ResidentBase):
    unit_number: Optional[str] = None
    owner_name: Optional[str] = None

class ResidentResponse(ResidentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
""",
    "app/schemas/transaction.py": """from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class TransactionBase(BaseModel):
    transaction_date: date
    amount: float
    transaction_type: str
    category: str
    description: Optional[str] = None
    reference_number: Optional[str] = None
    resident_id: Optional[int] = None
    document_id: Optional[int] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(TransactionBase):
    transaction_date: Optional[date] = None
    amount: Optional[float] = None
    transaction_type: Optional[str] = None
    category: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
""",
    "app/schemas/payment.py": """from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class PaymentBase(BaseModel):
    resident_id: int
    month: str
    due_amount: float
    paid_amount: float = 0.0
    due_date: date
    paid_date: Optional[date] = None
    status: str = "pending"
    penalty_amount: float = 0.0
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    paid_amount: Optional[float] = None
    paid_date: Optional[date] = None
    status: Optional[str] = None
    penalty_amount: Optional[float] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(PaymentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
""",
    "app/schemas/document.py": """from pydantic import BaseModel
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
""",
    "app/schemas/alert.py": """from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AlertBase(BaseModel):
    alert_type: str
    severity: str = "info"
    title: str
    message: str
    resident_id: Optional[int] = None

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True
""",
    "app/schemas/dashboard.py": """from pydantic import BaseModel
from typing import List, Dict, Any

class DashboardSummary(BaseModel):
    total_residents: int
    total_pending_dues: float
    monthly_collection_rate: float
    active_alerts: int

class TrendPoint(BaseModel):
    month: str
    income: float
    expense: float

class CategoryBreakdown(BaseModel):
    category: str
    amount: float

class DashboardTrend(BaseModel):
    trends: List[TrendPoint]

class DashboardCategoryBreakdown(BaseModel):
    breakdown: List[CategoryBreakdown]
""",
    "app/schemas/report.py": """from pydantic import BaseModel
from typing import List

class MonthlySummary(BaseModel):
    month: str
    total_income: float
    total_expense: float
    net_balance: float

class ResidentCollection(BaseModel):
    resident_id: int
    unit_number: str
    owner_name: str
    total_due: float
    total_paid: float
    outstanding_balance: float

class ExpenseBreakdown(BaseModel):
    category: str
    amount: float
    percentage: float
""",
    "app/schemas/audit_log.py": """from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True
"""
}

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
print("gen1 complete")
