"""add address to clients

Revision ID: add_address_clients
Revises: 18160c9b3d8a
Create Date: 2024-03-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'add_address_clients'
down_revision = '18160c9b3d8a'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Verificar si una columna existe en la tabla"""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # Add address column to clients table if it doesn't exist
    if not column_exists('clients', 'address'):
        op.add_column('clients', sa.Column('address', sa.String(500), nullable=True))


def downgrade() -> None:
    if column_exists('clients', 'address'):
        op.drop_column('clients', 'address')
