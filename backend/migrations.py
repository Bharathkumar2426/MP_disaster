"""
Database Migration Utility:
Executes idempotent, non-destructive schema migrations on startup to ensure new
columns and indexes exist without dropping tables or losing existing records.
"""
import logging
from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine

logger = logging.getLogger("disaster_migrations")


def run_migrations(engine: Engine) -> None:
    """
    Safely inspects the 'disasters' table and adds 'source', 'external_id',
    and 'updated_at' columns if they are not already present.
    Also ensures the unique partial index on (source, external_id) exists.
    """
    try:
        inspector = inspect(engine)
        table_names = inspector.get_table_names()

        if "disasters" not in table_names:
            # Table does not exist yet; create_all() will create it with full schema.
            return

        existing_columns = {c["name"] for c in inspector.get_columns("disasters")}

        with engine.begin() as conn:
            # 1. Add 'source' column if missing
            if "source" not in existing_columns:
                conn.execute(
                    text("ALTER TABLE disasters ADD COLUMN source VARCHAR(50) DEFAULT 'MANUAL'")
                )
                conn.execute(
                    text("UPDATE disasters SET source = 'MANUAL' WHERE source IS NULL")
                )
                logger.info("Migration: Added 'source' column to disasters table.")

            # 2. Add 'external_id' column if missing
            if "external_id" not in existing_columns:
                conn.execute(
                    text("ALTER TABLE disasters ADD COLUMN external_id VARCHAR(100)")
                )
                logger.info("Migration: Added 'external_id' column to disasters table.")

            # 3. Add 'updated_at' column if missing
            if "updated_at" not in existing_columns:
                conn.execute(
                    text("ALTER TABLE disasters ADD COLUMN updated_at DATETIME")
                )
                # Backfill existing records with reportedDate or current timestamp
                conn.execute(
                    text(
                        "UPDATE disasters SET updated_at = reportedDate "
                        "WHERE updated_at IS NULL AND reportedDate IS NOT NULL"
                    )
                )
                logger.info("Migration: Added 'updated_at' column to disasters table.")

            # 4. Create partial unique index on (source, external_id) if not exists
            # SQLite and PostgreSQL both support: WHERE external_id IS NOT NULL
            try:
                conn.execute(
                    text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS uq_disasters_source_external_id "
                        "ON disasters (source, external_id) WHERE external_id IS NOT NULL"
                    )
                )
                logger.info("Migration: Ensured unique partial index 'uq_disasters_source_external_id'.")
            except Exception as index_err:
                logger.warning("Migration index notice: %s", index_err)

        # ── Phase 4 Migration: User Alert Location & Notifications ──
        if "users" in table_names:
            user_columns = {c["name"] for c in inspector.get_columns("users")}
            with engine.begin() as conn:
                if "alertLocationName" not in user_columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN alertLocationName VARCHAR(150)"))
                    logger.info("Migration: Added 'alertLocationName' to users table.")

                if "alertLatitude" not in user_columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN alertLatitude FLOAT"))
                    logger.info("Migration: Added 'alertLatitude' to users table.")

                if "alertLongitude" not in user_columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN alertLongitude FLOAT"))
                    logger.info("Migration: Added 'alertLongitude' to users table.")

                if "alertRadiusKm" not in user_columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN alertRadiusKm FLOAT DEFAULT 50.0"))
                    conn.execute(text("UPDATE users SET alertRadiusKm = 50.0 WHERE alertRadiusKm IS NULL"))
                    logger.info("Migration: Added 'alertRadiusKm' to users table.")

        # Ensure unique index on notifications (userId, disasterId)
        if "notifications" in table_names:
            with engine.begin() as conn:
                try:
                    conn.execute(
                        text(
                            "CREATE UNIQUE INDEX IF NOT EXISTS uq_user_disaster_notification "
                            "ON notifications (userId, disasterId)"
                        )
                    )
                    logger.info("Migration: Ensured unique index 'uq_user_disaster_notification'.")
                except Exception as index_err:
                    logger.warning("Migration notifications index notice: %s", index_err)

    except Exception as e:
        logger.error("Migration encountered an error: %s", e)
        raise
