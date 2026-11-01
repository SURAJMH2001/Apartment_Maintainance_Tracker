import os

base_dir = r"d:\Apartment_Mainatainance_Tracker\backend"

files = {
    "app/repositories/__init__.py": "",
    "app/repositories/base.py": """from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy.orm import Session
from app.models.base import BaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        return db.query(self.model).filter(self.model.id == id).first()

    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: dict) -> ModelType:
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: ModelType, obj_in: dict) -> ModelType:
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: Any) -> ModelType:
        obj = db.query(self.model).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj
""",
    "app/repositories/user_repository.py": """from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.user import User
from typing import Optional

class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)
        
    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        return db.query(self.model).filter(self.model.username == username).first()

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(self.model).filter(self.model.email == email).first()

user_repo = UserRepository()
""",
    "app/repositories/resident_repository.py": """from app.repositories.base import BaseRepository
from app.models.resident import Resident

class ResidentRepository(BaseRepository[Resident]):
    def __init__(self):
        super().__init__(Resident)

resident_repo = ResidentRepository()
""",
    "app/repositories/transaction_repository.py": """from app.repositories.base import BaseRepository
from app.models.transaction import Transaction

class TransactionRepository(BaseRepository[Transaction]):
    def __init__(self):
        super().__init__(Transaction)

transaction_repo = TransactionRepository()
""",
    "app/repositories/payment_repository.py": """from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.payment import Payment
from typing import List

class PaymentRepository(BaseRepository[Payment]):
    def __init__(self):
        super().__init__(Payment)
        
    def get_by_resident_and_month(self, db: Session, resident_id: int, month: str) -> Payment:
        return db.query(self.model).filter(
            self.model.resident_id == resident_id,
            self.model.month == month
        ).first()

payment_repo = PaymentRepository()
""",
    "app/repositories/alert_repository.py": """from app.repositories.base import BaseRepository
from app.models.alert import Alert

class AlertRepository(BaseRepository[Alert]):
    def __init__(self):
        super().__init__(Alert)

alert_repo = AlertRepository()
""",
    "app/repositories/audit_repository.py": """from app.repositories.base import BaseRepository
from app.models.audit_log import AuditLog

class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self):
        super().__init__(AuditLog)

audit_repo = AuditRepository()
""",
    "app/services/__init__.py": "",
    "app/services/audit_service.py": """from sqlalchemy.orm import Session
from app.repositories.audit_repository import audit_repo
from typing import Optional, Dict, Any

class AuditService:
    @staticmethod
    def log_action(db: Session, user_id: Optional[int], username: Optional[str], action: str, entity_type: str, entity_id: Optional[str], old_values: Optional[Dict[str, Any]] = None, new_values: Optional[Dict[str, Any]] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None):
        log_data = {
            "user_id": user_id,
            "username": username,
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id else None,
            "old_values": old_values,
            "new_values": new_values,
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        audit_repo.create(db, log_data)
""",
    "app/parsers/__init__.py": "",
    "app/parsers/base_parser.py": """from abc import ABC, abstractmethod
from typing import List
from app.schemas.document import ParsedTransaction

class AbstractParser(ABC):
    @abstractmethod
    def parse(self, file_path: str) -> List[ParsedTransaction]:
        pass
""",
    "app/parsers/pdf_parser.py": """import pdfplumber
import re
from typing import List
from datetime import datetime
from app.parsers.base_parser import AbstractParser
from app.schemas.document import ParsedTransaction

class PDFParser(AbstractParser):
    def parse(self, file_path: str) -> List[ParsedTransaction]:
        transactions = []
        date_pattern = re.compile(r"(\d{2}/\d{2}/\d{4})")
        amount_pattern = re.compile(r"\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2}))")
        
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    for line in text.split('\\n'):
                        date_match = date_pattern.search(line)
                        amount_match = amount_pattern.search(line)
                        if date_match and amount_match:
                            try:
                                dt = datetime.strptime(date_match.group(1), "%d/%m/%Y")
                                amt = float(amount_match.group(1).replace(",", ""))
                                transactions.append(ParsedTransaction(
                                    transaction_date=dt,
                                    amount=amt,
                                    transaction_type="income",
                                    category="other",
                                    description=line,
                                    reference_number=None,
                                    resident_unit=None
                                ))
                            except Exception:
                                pass
        return transactions
""",
    "app/parsers/docx_parser.py": """import docx
import re
from typing import List
from datetime import datetime
from app.parsers.base_parser import AbstractParser
from app.schemas.document import ParsedTransaction

class DocxParser(AbstractParser):
    def parse(self, file_path: str) -> List[ParsedTransaction]:
        doc = docx.Document(file_path)
        transactions = []
        date_pattern = re.compile(r"(\d{2}/\d{2}/\d{4})")
        amount_pattern = re.compile(r"\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2}))")
        
        for para in doc.paragraphs:
            line = para.text
            date_match = date_pattern.search(line)
            amount_match = amount_pattern.search(line)
            if date_match and amount_match:
                try:
                    dt = datetime.strptime(date_match.group(1), "%d/%m/%Y")
                    amt = float(amount_match.group(1).replace(",", ""))
                    transactions.append(ParsedTransaction(
                        transaction_date=dt,
                        amount=amt,
                        transaction_type="income",
                        category="other",
                        description=line,
                        reference_number=None,
                        resident_unit=None
                    ))
                except Exception:
                    pass
        return transactions
""",
    "app/parsers/xlsx_parser.py": """import pandas as pd
from typing import List
from datetime import datetime
from app.parsers.base_parser import AbstractParser
from app.schemas.document import ParsedTransaction

class XlsxParser(AbstractParser):
    def parse(self, file_path: str) -> List[ParsedTransaction]:
        df = pd.read_excel(file_path)
        transactions = []
        for index, row in df.iterrows():
            try:
                if pd.isna(row.get('date')) or pd.isna(row.get('amount')):
                    continue
                dt = pd.to_datetime(row['date']).to_pydatetime()
                amt = float(row['amount'])
                transactions.append(ParsedTransaction(
                    transaction_date=dt,
                    amount=amt,
                    transaction_type=str(row.get('type', 'income')),
                    category=str(row.get('category', 'other')),
                    description=str(row.get('description', '')),
                    reference_number=str(row.get('reference', '')) if pd.notna(row.get('reference')) else None,
                    resident_unit=str(row.get('unit', '')) if pd.notna(row.get('unit')) else None
                ))
            except Exception:
                pass
        return transactions
""",
    "app/services/document_service.py": """from app.parsers.pdf_parser import PDFParser
from app.parsers.docx_parser import DocxParser
from app.parsers.xlsx_parser import XlsxParser

class DocumentService:
    @staticmethod
    def get_parser(file_type: str):
        if file_type == 'application/pdf':
            return PDFParser()
        elif file_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return DocxParser()
        elif file_type in ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']:
            return XlsxParser()
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
"""
}

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
print("gen2 complete")
