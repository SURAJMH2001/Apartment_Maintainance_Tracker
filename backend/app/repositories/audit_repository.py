from app.repositories.base import BaseRepository
from app.models.audit_log import AuditLog

class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self):
        super().__init__(AuditLog)

audit_repo = AuditRepository()
