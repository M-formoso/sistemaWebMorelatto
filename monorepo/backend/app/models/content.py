import uuid
from sqlalchemy import Column, String, Boolean, Text, Date
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, TimestampMixin


class News(Base, TimestampMixin):
    """Novedades/Blog para el ecommerce"""
    __tablename__ = "news"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    excerpt = Column(Text, nullable=True)  # Resumen
    content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    published_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<News {self.title}>"
