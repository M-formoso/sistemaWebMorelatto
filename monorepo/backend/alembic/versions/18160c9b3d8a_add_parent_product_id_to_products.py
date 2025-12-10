"""add parent_product_id to products

Revision ID: 18160c9b3d8a
Revises: 
Create Date: 2025-12-04 19:16:56.785705

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '18160c9b3d8a'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add parent_product_id column to products table
    op.add_column('products', sa.Column('parent_product_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_products_parent_product_id', 'products', 'products', ['parent_product_id'], ['id'])


def downgrade() -> None:
    # Remove foreign key and column
    op.drop_constraint('fk_products_parent_product_id', 'products', type_='foreignkey')
    op.drop_column('products', 'parent_product_id')
