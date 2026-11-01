from app.repositories.base import BaseRepository
from app.models.transaction import Transaction

class TransactionRepository(BaseRepository[Transaction]):
    def __init__(self):
        super().__init__(Transaction)

transaction_repo = TransactionRepository()
