from abc import ABC, abstractmethod
from typing import List
from app.schemas.document import ParsedTransaction

class AbstractParser(ABC):
    @abstractmethod
    def parse(self, file_path: str) -> List[ParsedTransaction]:
        pass
