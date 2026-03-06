import uuid
from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin


class Client(Base, TimestampMixin):
    """
    Clientes del sistema (ventas presenciales, talleres).
    Diferente de User que son usuarios registrados en el ecommerce.
    """
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    document = Column(String(50), nullable=True)  # DNI/CUIT
    address = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    sales = relationship("Sale", back_populates="client")
    workshop_enrollments = relationship("WorkshopClient", back_populates="client")

    def __repr__(self):
        return f"<Client {self.name}>"
