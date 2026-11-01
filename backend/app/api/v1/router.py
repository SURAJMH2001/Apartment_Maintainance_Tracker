from fastapi import APIRouter
from app.api.v1 import (
    auth, residents, transactions, documents, payments, alerts,
    dashboard, reports, audit, settings, vehicles, announcements,
    tasks, assets, users, feedbacks, issues, vendors
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(residents.router, prefix="/residents", tags=["residents"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(announcements.router, prefix="/announcements", tags=["announcements"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(assets.router, prefix="/assets", tags=["assets"])
api_router.include_router(feedbacks.router, prefix="/feedbacks", tags=["feedbacks"])
api_router.include_router(issues.router, prefix="/issues", tags=["issues"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["vendors"])
