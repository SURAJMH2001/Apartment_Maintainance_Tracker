from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date

from app.core.database import get_db
from app.models.task import Task
from app.models.issue import Issue
from app.core.dependencies import get_current_user, get_current_manager_or_admin

router = APIRouter()

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = "Maintenance"
    location: Optional[str] = None
    assignee: Optional[str] = None
    status: str = "pending"
    priority: str = "medium"
    due_date: Optional[date] = None
    resident_id: Optional[str] = None
    issue_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    assignee: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    resident_id: Optional[str] = None
    issue_id: Optional[int] = None

class TaskResponse(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

@router.get("", response_model=List[TaskResponse])
def get_tasks(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Task).order_by(Task.created_at.desc()).all()

@router.post("", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.put("/{id}", response_model=TaskResponse)
def update_task(id: int, task: TaskUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_task = db.query(Task).filter(Task.id == id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(db_task, k, v)

    # Auto-sync status to linked issue
    if "status" in update_data:
        target_issue = None
        if db_task.issue_id:
            target_issue = db.query(Issue).filter(Issue.id == db_task.issue_id).first()
        if not target_issue:
            target_issue = db.query(Issue).filter(Issue.task_id == db_task.id).first()
        
        if target_issue:
            if db_task.status == "completed":
                target_issue.status = "resolved"
            elif db_task.status == "in_progress":
                target_issue.status = "in_progress"
            elif db_task.status == "pending":
                target_issue.status = "pending"
        
    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/{id}")
def delete_task(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_task = db.query(Task).filter(Task.id == id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Unlink any associated issue
    if db_task.issue_id:
        iss = db.query(Issue).filter(Issue.id == db_task.issue_id).first()
        if iss:
            iss.task_id = None
    iss_by_task = db.query(Issue).filter(Issue.task_id == db_task.id).first()
    if iss_by_task:
        iss_by_task.task_id = None

    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted successfully"}
