"""add parent_product_id to products

Revision ID: 18160c9b3d8a
Revises:
Create Date: 2025-12-04 19:16:56.785705

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '18160c9b3d8a'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name, column_name):
    """Verificar si una columna existe en la tabla"""
    bind = op.get_bind()
    inspector = inspect(bind)
    try:
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception:
        return False


def constraint_exists(table_name, constraint_name):
    """Verificar si un constraint existe"""
    bind = op.get_bind()
    inspector = inspect(bind)
    try:
        fks = inspector.get_foreign_keys(table_name)
        return any(fk['name'] == constraint_name for fk in fks)
    except Exception:
        return False


def upgrade() -> None:
    # Add parent_product_id column to products table if it doesn't exist
    if not column_exists('products', 'parent_product_id'):
        op.add_column('products', sa.Column('parent_product_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))

    if not constraint_exists('products', 'fk_products_parent_product_id'):
        try:
            op.create_foreign_key('fk_products_parent_product_id', 'products', 'products', ['parent_product_id'], ['id'])
        except Exception:
            pass  # FK might already exist with different name


def downgrade() -> None:
    # Remove foreign key and column
    if constraint_exists('products', 'fk_products_parent_product_id'):
        op.drop_constraint('fk_products_parent_product_id', 'products', type_='foreignkey')
    if column_exists('products', 'parent_product_id'):
        op.drop_column('products', 'parent_product_id')
