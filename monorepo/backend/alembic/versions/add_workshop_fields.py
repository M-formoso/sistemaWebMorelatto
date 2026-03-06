"""add workshop fields for frontend compatibility

Revision ID: add_workshop_fields
Revises: add_address_clients
Create Date: 2024-03-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'add_workshop_fields'
down_revision = 'add_address_clients'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Verificar si una columna existe en la tabla"""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # Add new columns to workshops table if they don't exist
    if not column_exists('workshops', 'title'):
        op.add_column('workshops', sa.Column('title', sa.String(255), nullable=True))
    if not column_exists('workshops', 'date'):
        op.add_column('workshops', sa.Column('date', sa.Date(), nullable=True))
    if not column_exists('workshops', 'duration_hours'):
        op.add_column('workshops', sa.Column('duration_hours', sa.Integer(), nullable=True))
    if not column_exists('workshops', 'materials_included'):
        op.add_column('workshops', sa.Column('materials_included', sa.Text(), nullable=True))

    # Make name and slug nullable (they will be auto-generated)
    # These might already be nullable from create_all, so we wrap in try/except
    try:
        op.alter_column('workshops', 'name', existing_type=sa.String(255), nullable=True)
    except Exception:
        pass
    try:
        op.alter_column('workshops', 'slug', existing_type=sa.String(255), nullable=True)
    except Exception:
        pass


def downgrade() -> None:
    if column_exists('workshops', 'title'):
        op.drop_column('workshops', 'title')
    if column_exists('workshops', 'date'):
        op.drop_column('workshops', 'date')
    if column_exists('workshops', 'duration_hours'):
        op.drop_column('workshops', 'duration_hours')
    if column_exists('workshops', 'materials_included'):
        op.drop_column('workshops', 'materials_included')
