# Import all models so SQLAlchemy can resolve foreign key relationships
from app.models.base import BaseModel
from app.models.user import User
from app.models.resident import Resident
from app.models.document import Document
from app.models.transaction import Transaction
from app.models.payment import Payment
from app.models.alert import Alert
from app.models.audit_log import AuditLog
from app.models.vehicle import Vehicle
from app.models.announcement import Announcement
from app.models.task import Task
from app.models.asset import Asset
from app.models.setting import AppSetting
from app.models.feedback import Feedback
from app.models.issue import Issue, IssueComment, IssueReaction
from app.models.vendor import Vendor

__all__ = [
    "BaseModel",
    "User",
    "Resident",
    "Document",
    "Transaction",
    "Payment",
    "Alert",
    "AuditLog",
    "Vehicle",
    "Announcement",
    "Task",
    "Asset",
    "AppSetting",
    "Feedback",
    "Issue",
    "IssueComment",
    "IssueReaction",
    "Vendor",
]
