from app.repositories.base import BaseRepository
from app.models.resident import Resident

class ResidentRepository(BaseRepository[Resident]):
    def __init__(self):
        super().__init__(Resident)

resident_repo = ResidentRepository()
