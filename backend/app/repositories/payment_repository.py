from sqlalchemy.orm import Session
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
