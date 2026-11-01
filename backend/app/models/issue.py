from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Issue(BaseModel):
    __tablename__ = "issues"
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    category = Column(String, default="maintenance")
    priority = Column(String, default="medium")
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, in_progress, resolved
    admin_response = Column(Text, nullable=True)
    task_id = Column(Integer, nullable=True)

    comments = relationship("IssueComment", back_populates="issue", cascade="all, delete-orphan", order_by="IssueComment.created_at.asc()")
    reactions = relationship("IssueReaction", back_populates="issue", cascade="all, delete-orphan")


class IssueComment(BaseModel):
    __tablename__ = "issue_comments"
    issue_id = Column(Integer, ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_name = Column(String, nullable=False)
    author_role = Column(String, default="resident")
    author_unit = Column(String, nullable=True)
    comment = Column(Text, nullable=False)
    is_admin = Column(Boolean, default=False)

    issue = relationship("Issue", back_populates="comments")


class IssueReaction(BaseModel):
    __tablename__ = "issue_reactions"
    issue_id = Column(Integer, ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String, nullable=False)
    emoji = Column(String, nullable=False)

    issue = relationship("Issue", back_populates="reactions")
