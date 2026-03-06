"""add workshop fields for frontend compatibility

Revision ID: add_workshop_fields
Revises: add_address_clients
Create Date: 2024-03-06

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_workshop_fields'
down_revision = 'add_address_clients'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to workshops table
    op.add_column('workshops', sa.Column('title', sa.String(255), nullable=True))
    op.add_column('workshops', sa.Column('date', sa.Date(), nullable=True))
    op.add_column('workshops', sa.Column('duration_hours', sa.Integer(), nullable=True))
    op.add_column('workshops', sa.Column('materials_included', sa.Text(), nullable=True))

    # Make name and slug nullable (they will be auto-generated)
    op.alter_column('workshops', 'name', existing_type=sa.String(255), nullable=True)
    op.alter_column('workshops', 'slug', existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    op.drop_column('workshops', 'title')
    op.drop_column('workshops', 'date')
    op.drop_column('workshops', 'duration_hours')
    op.drop_column('workshops', 'materials_included')

    op.alter_column('workshops', 'name', existing_type=sa.String(255), nullable=False)
    op.alter_column('workshops', 'slug', existing_type=sa.String(255), nullable=False)
