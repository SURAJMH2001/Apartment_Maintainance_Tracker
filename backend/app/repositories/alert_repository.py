from app.repositories.base import BaseRepository
from app.models.alert import Alert

class AlertRepository(BaseRepository[Alert]):
    def __init__(self):
        super().__init__(Alert)

alert_repo = AlertRepository()
