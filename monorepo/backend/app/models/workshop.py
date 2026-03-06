import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, ForeignKey, Text, Date, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base, TimestampMixin


class ProjectStatus(str, enum.Enum):
    IN_PROGRESS = "en_progreso"
    COMPLETED = "completado"
    PAUSED = "pausado"


class Workshop(Base, TimestampMixin):
    """
    Talleres unificados.
    Usados tanto en el sistema como publicados en el ecommerce.
    """
    __tablename__ = "workshops"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Datos basicos
    name = Column(String(255), nullable=True)  # Alias: title
    title = Column(String(255), nullable=True)  # Campo principal del frontend
    slug = Column(String(255), unique=True, nullable=True, index=True)  # Auto-generado
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)  # Contenido largo para la pagina

    # Fechas y ubicacion
    date = Column(Date, nullable=True)  # Campo del frontend (fecha/hora)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    duration_hours = Column(Integer, nullable=True)  # Duracion en horas
    location = Column(String(255), nullable=True)

    # Materiales
    materials_included = Column(Text, nullable=True)  # Materiales incluidos

    # Precio y cuotas
    price = Column(Numeric(12, 2), default=0)
    installments_allowed = Column(Integer, default=1)  # cuotas_permitidas
    product_discount = Column(Numeric(5, 2), default=0)  # descuento_productos %

    # Capacidad
    max_participants = Column(Integer, nullable=True)
    current_participants = Column(Integer, default=0)

    # Estado y visibilidad
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)  # visible en ecommerce
    image_url = Column(String(500), nullable=True)

    # Relationships
    enrollments = relationship("WorkshopClient", back_populates="workshop", cascade="all, delete-orphan")
    images = relationship("WorkshopImage", back_populates="workshop", cascade="all, delete-orphan", order_by="WorkshopImage.display_order")

    def __repr__(self):
        return f"<Workshop {self.name}>"


class WorkshopClient(Base, TimestampMixin):
    """Inscripciones a talleres (clientas_taller)"""
    __tablename__ = "workshop_clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workshop_id = Column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)

    # Datos del cliente (pueden ser independientes)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    document = Column(String(50), nullable=True)

    # Pago
    enrollment_date = Column(Date, nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)  # monto_total
    paid_amount = Column(Numeric(12, 2), default=0)  # monto_pagado

    # Relationships
    workshop = relationship("Workshop", back_populates="enrollments")
    client = relationship("Client", back_populates="workshop_enrollments")
    attendances = relationship("Attendance", back_populates="enrollment", cascade="all, delete-orphan")
    projects = relationship("WorkshopProject", back_populates="enrollment", cascade="all, delete-orphan")
    # payment_installments relationship is defined by PaymentInstallment in finance.py
    payment_installments = relationship("PaymentInstallment", back_populates="enrollment", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<WorkshopClient {self.name} - {self.workshop_id}>"


class Attendance(Base, TimestampMixin):
    """Asistencias a talleres"""
    __tablename__ = "attendances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("workshop_clients.id", ondelete="CASCADE"), nullable=False)

    date = Column(Date, nullable=False)
    attended = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    # Relationships
    enrollment = relationship("WorkshopClient", back_populates="attendances")

    def __repr__(self):
        return f"<Attendance {self.enrollment_id} - {self.date}>"


class WorkshopProject(Base, TimestampMixin):
    """Proyectos de alumnas en talleres"""
    __tablename__ = "workshop_projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("workshop_clients.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.IN_PROGRESS)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

    # Relationships
    enrollment = relationship("WorkshopClient", back_populates="projects")
    purchases = relationship("ProjectPurchase", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<WorkshopProject {self.name}>"


class ProjectPurchase(Base, TimestampMixin):
    """Compras de productos para proyectos de taller (con descuento)"""
    __tablename__ = "project_purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("workshop_projects.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)

    date = Column(Date, nullable=False)
    quantity = Column(Integer, nullable=False)
    original_price = Column(Numeric(12, 2), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    final_price = Column(Numeric(12, 2), nullable=False)

    # Relationships
    project = relationship("WorkshopProject", back_populates="purchases")
    product = relationship("Product")

    def __repr__(self):
        return f"<ProjectPurchase {self.product_id}>"


class WorkshopImage(Base, TimestampMixin):
    """Imagenes de talleres para galeria"""
    __tablename__ = "workshop_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    alt_text = Column(String(255), nullable=True)

    # Relationships
    workshop = relationship("Workshop", back_populates="images")

    def __repr__(self):
        return f"<WorkshopImage {self.id} - Primary: {self.is_primary}>"
