"""add rider auth fields

Revision ID: 002_rider_auth
Revises: 001_initial
Create Date: 2026-09-08

This migration adds authentication fields to the riders table:
- first_name, last_name: Split name fields for auth
- password_hash: Hashed password for rider login
- vehicle_type: motorcycle or bicycle
- vehicle_plate_number: Vehicle plate number
- email: Now unique and not nullable

The existing 'name' field is retained for backward compatibility.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_rider_auth'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to riders table
    op.add_column('riders', sa.Column('first_name', sa.String(100), nullable=True))
    op.add_column('riders', sa.Column('last_name', sa.String(100), nullable=True))
    op.add_column('riders', sa.Column('password_hash', sa.String(500), nullable=True))
    op.add_column('riders', sa.Column('vehicle_type', sa.String(50), nullable=True))
    op.add_column('riders', sa.Column('vehicle_plate_number', sa.String(50), nullable=True))

    # Make email unique and not nullable
    op.alter_column('riders', 'email', nullable=False)
    op.create_unique_constraint('uq_riders_email', 'riders', ['email'])

    # Populate first_name and last_name from existing name field
    op.execute("""
        UPDATE riders
        SET first_name = split_part(name, ' ', 1),
            last_name = CASE
                WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1)
                ELSE ''
            END
        WHERE first_name IS NULL
    """)

    # Set password_hash for existing riders (they'll need to reset password)
    op.execute("""
        UPDATE riders
        SET password_hash = ''
        WHERE password_hash IS NULL
    """)

    # Now make the new columns not nullable
    op.alter_column('riders', 'first_name', nullable=False)
    op.alter_column('riders', 'last_name', nullable=False)
    op.alter_column('riders', 'password_hash', nullable=False)


def downgrade() -> None:
    # Drop the new columns
    op.drop_constraint('uq_riders_email', 'riders', type_='unique')
    op.drop_column('riders', 'vehicle_plate_number')
    op.drop_column('riders', 'vehicle_type')
    op.drop_column('riders', 'password_hash')
    op.drop_column('riders', 'last_name')
    op.drop_column('riders', 'first_name')

    # Revert email to nullable
    op.alter_column('riders', 'email', nullable=True)
