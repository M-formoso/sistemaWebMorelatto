import uuid
from sqlalchemy import Column, String, Boolean, Text, Date, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

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

    # Layout configuration - customizable by admin
    card_size = Column(String(50), default="medium")  # small, medium, large
    layout_type = Column(String(50), default="grid")  # grid, list, featured

    # Relationships
    images = relationship("NewsImage", back_populates="news", cascade="all, delete-orphan", order_by="NewsImage.display_order")

    def __repr__(self):
        return f"<News {self.title}>"


class NewsImage(Base, TimestampMixin):
    """Imagenes de novedades para galeria"""
    __tablename__ = "news_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    news_id = Column(UUID(as_uuid=True), ForeignKey("news.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    alt_text = Column(String(255), nullable=True)

    # Relationships
    news = relationship("News", back_populates="images")

    def __repr__(self):
        return f"<NewsImage {self.id} - Primary: {self.is_primary}>"
