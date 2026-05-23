from sqlalchemy import Column, Integer, String, ForeignKey

from src.db.database import Base

class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    asv_score = Column(String)