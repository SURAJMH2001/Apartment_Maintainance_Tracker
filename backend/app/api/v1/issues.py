from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.issue import Issue, IssueComment, IssueReaction
from app.models.task import Task
from app.models.resident import Resident
from app.core.dependencies import get_current_user, get_current_manager_or_admin

router = APIRouter()

class CommentCreate(BaseModel):
    comment: str

class CommentResponse(BaseModel):
    id: int
    issue_id: int
    user_id: Optional[int] = None
    author_name: str
    author_role: Optional[str] = "resident"
    author_unit: Optional[str] = None
    comment: str
    is_admin: bool = False
    created_at: datetime
    class Config:
        from_attributes = True

class ReactionCreate(BaseModel):
    emoji: str

class IssueCreate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    unit: Optional[str] = None
    category: str = "maintenance"
    priority: str = "medium"
    title: str
    description: str
    location: Optional[str] = None

class IssueUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    admin_response: Optional[str] = None

class IssueResponse(IssueCreate):
    id: int
    status: str
    admin_response: Optional[str] = None
    task_id: Optional[int] = None
    created_at: datetime
    comments: List[CommentResponse] = []
    reactions_summary: Dict[str, int] = {}
    user_reactions: List[str] = []

    class Config:
        from_attributes = True

def _build_issue_response(iss: Issue, current_user_id: Optional[int] = None) -> IssueResponse:
    # Build reaction summary
    summary: Dict[str, int] = {}
    user_reacts: List[str] = []
    for r in (iss.reactions or []):
        summary[r.emoji] = summary.get(r.emoji, 0) + 1
        if current_user_id and r.user_id == current_user_id:
            user_reacts.append(r.emoji)

    comments_list = [
        CommentResponse(
            id=c.id,
            issue_id=c.issue_id,
            user_id=c.user_id,
            author_name=c.author_name,
            author_role=c.author_role,
            author_unit=c.author_unit,
            comment=c.comment,
            is_admin=bool(c.is_admin),
            created_at=c.created_at or datetime.now(timezone.utc)
        )
        for c in (iss.comments or [])
    ]

    return IssueResponse(
        id=iss.id,
        name=iss.name,
        email=iss.email,
        phone=iss.phone,
        unit=iss.unit,
        category=iss.category or "maintenance",
        priority=iss.priority or "medium",
        title=iss.title,
        description=iss.description,
        location=iss.location,
        status=iss.status or "pending",
        admin_response=iss.admin_response,
        task_id=iss.task_id,
        created_at=iss.created_at or datetime.now(timezone.utc),
        comments=comments_list,
        reactions_summary=summary,
        user_reactions=user_reacts
    )

@router.get("", response_model=List[IssueResponse])
def get_issues(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    issues = db.query(Issue).order_by(Issue.created_at.desc()).all()
    return [_build_issue_response(iss, current_user.id) for iss in issues]

@router.post("", response_model=IssueResponse)
def create_issue(issue_in: IssueCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # 1. Create the issue
    iss = Issue(
        name=issue_in.name or current_user.display_name or current_user.username,
        email=issue_in.email or current_user.email,
        phone=issue_in.phone,
        unit=issue_in.unit or getattr(current_user, 'unit_number', None) or 'General',
        category=issue_in.category,
        priority=issue_in.priority,
        title=issue_in.title,
        description=issue_in.description,
        location=issue_in.location or issue_in.unit,
        status="pending"
    )
    db.add(iss)
    db.commit()
    db.refresh(iss)

    # 2. Auto-sync to Tasks for Admin resolution
    try:
        # Find resident_id if unit is provided
        res_id_str = None
        if iss.unit:
            res = db.query(Resident).filter(Resident.unit_number == iss.unit).first()
            if res:
                res_id_str = str(res.id)
        if not res_id_str and current_user.resident_id:
            res_id_str = str(current_user.resident_id)

        task_category = (iss.category or "Maintenance").capitalize()
        if task_category not in ["Electrical", "Plumbing", "HVAC", "Maintenance", "Safety"]:
            task_category = "Maintenance"

        db_task = Task(
            title=f"[{iss.unit or 'General'}] {iss.title}",
            description=f"Resident Issue #{iss.id} reported by {iss.name} ({iss.phone or 'No phone'}) for unit {iss.unit or 'General'}:\n{iss.description}",
            category=task_category,
            location=iss.location or iss.unit or "General",
            assignee="Admin",
            status="pending",
            priority=iss.priority or "medium",
            resident_id=res_id_str,
            issue_id=iss.id
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)

        # Link task_id back to issue
        iss.task_id = db_task.id
        db.commit()
        db.refresh(iss)
    except Exception as e:
        print(f"Auto-sync task creation warning: {e}")

    return _build_issue_response(iss, current_user.id)

@router.put("/{id}", response_model=IssueResponse)
def update_issue(id: int, issue_in: IssueUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    iss = db.query(Issue).filter(Issue.id == id).first()
    if not iss:
        raise HTTPException(status_code=404, detail="Issue not found")

    is_admin = current_user.role in ['admin', 'super-admin', 'superadmin', 'manager']

    # Update basic fields
    if issue_in.priority:
        iss.priority = issue_in.priority

    # Handle status change
    if issue_in.status:
        iss.status = issue_in.status
        # Auto-sync status to linked task
        if iss.task_id:
            task = db.query(Task).filter(Task.id == iss.task_id).first()
            if task:
                if issue_in.status == "resolved":
                    task.status = "completed"
                elif issue_in.status == "in_progress":
                    task.status = "in_progress"
                elif issue_in.status == "pending":
                    task.status = "pending"

    # Handle Admin Response
    if issue_in.admin_response:
        iss.admin_response = issue_in.admin_response
        # Also post as an official admin comment
        admin_comment = IssueComment(
            issue_id=iss.id,
            user_id=current_user.id,
            author_name=current_user.display_name or current_user.username or "Admin",
            author_role=current_user.role,
            author_unit=getattr(current_user, "unit_number", None) or "Office",
            comment=f"[Admin Response] {issue_in.admin_response}",
            is_admin=True
        )
        db.add(admin_comment)

    db.commit()
    db.refresh(iss)
    return _build_issue_response(iss, current_user.id)

@router.post("/{id}/comments", response_model=CommentResponse)
def add_issue_comment(id: int, comment_in: CommentCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    iss = db.query(Issue).filter(Issue.id == id).first()
    if not iss:
        raise HTTPException(status_code=404, detail="Issue not found")

    is_admin = current_user.role in ['admin', 'super-admin', 'superadmin', 'manager']
    unit_str = getattr(current_user, "unit_number", None)
    if not unit_str and current_user.resident_id:
        res = db.query(Resident).filter(Resident.id == current_user.resident_id).first()
        if res:
            unit_str = res.unit_number

    c = IssueComment(
        issue_id=iss.id,
        user_id=current_user.id,
        author_name=current_user.display_name or current_user.username,
        author_role=current_user.role,
        author_unit=unit_str or ("Management" if is_admin else "Resident"),
        comment=comment_in.comment,
        is_admin=is_admin
    )
    db.add(c)

    # If admin commented, also update admin_response on the issue
    if is_admin:
        iss.admin_response = comment_in.comment

    db.commit()
    db.refresh(c)
    return CommentResponse(
        id=c.id,
        issue_id=c.issue_id,
        user_id=c.user_id,
        author_name=c.author_name,
        author_role=c.author_role,
        author_unit=c.author_unit,
        comment=c.comment,
        is_admin=bool(c.is_admin),
        created_at=c.created_at or datetime.now(timezone.utc)
    )

@router.post("/{id}/react")
def react_to_issue(id: int, reaction_in: ReactionCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    iss = db.query(Issue).filter(Issue.id == id).first()
    if not iss:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Check if user already reacted with this emoji
    existing = db.query(IssueReaction).filter(
        IssueReaction.issue_id == iss.id,
        IssueReaction.user_id == current_user.id,
        IssueReaction.emoji == reaction_in.emoji
    ).first()

    if existing:
        # Toggle off
        db.delete(existing)
        action = "removed"
    else:
        # Add reaction
        new_react = IssueReaction(
            issue_id=iss.id,
            user_id=current_user.id,
            user_name=current_user.display_name or current_user.username,
            emoji=reaction_in.emoji
        )
        db.add(new_react)
        action = "added"

    db.commit()
    db.refresh(iss)

    # Return refreshed summary
    summary: Dict[str, int] = {}
    user_reacts: List[str] = []
    for r in (iss.reactions or []):
        summary[r.emoji] = summary.get(r.emoji, 0) + 1
        if r.user_id == current_user.id:
            user_reacts.append(r.emoji)

    return {
        "action": action,
        "emoji": reaction_in.emoji,
        "reactions_summary": summary,
        "user_reactions": user_reacts
    }

@router.delete("/{id}")
def delete_issue(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    iss = db.query(Issue).filter(Issue.id == id).first()
    if not iss:
        raise HTTPException(status_code=404, detail="Issue not found")

    is_admin = current_user.role in ['admin', 'super-admin', 'superadmin', 'manager']
    is_owner = (
        (iss.email and current_user.email and iss.email.lower() == current_user.email.lower()) or
        (getattr(current_user, 'unit_number', None) and iss.unit == current_user.unit_number) or
        (current_user.display_name and current_user.display_name.lower() in (iss.name or '').lower()) or
        (current_user.username and current_user.username.lower() in (iss.name or '').lower())
    )
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="You can only delete your own reported issue")

    # If linked to a task, clean up the task as well
    if iss.task_id:
        task = db.query(Task).filter(Task.id == iss.task_id).first()
        if task:
            db.delete(task)

    db.delete(iss)
    db.commit()
    return {"message": "Issue deleted"}
