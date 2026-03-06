"""add address to clients

Revision ID: add_address_clients
Revises: 18160c9b3d8a
Create Date: 2024-03-06

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_address_clients'
down_revision = '18160c9b3d8a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add address column to clients table if it doesn't exist
    op.add_column('clients', sa.Column('address', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('clients', 'address')
