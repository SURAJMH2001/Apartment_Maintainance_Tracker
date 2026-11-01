from sqlalchemy import Column, String, Integer, Text
from app.models.base import BaseModel

class Feedback(BaseModel):
    __tablename__ = "feedbacks"
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    rating = Column(Integer, default=5)
    category = Column(String, default="service")
    unit = Column(String, nullable=True)
