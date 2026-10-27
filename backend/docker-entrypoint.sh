# Docker entrypoint for backend

#!/bin/sh
set -e

# Wait for DB to be ready (simple loop)
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Wait for DB to be ready (simple loop)
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done

# Run raw SQL migrations (all .sql files in /app/migrations)
for file in /app/migrations/*.sql; do
  echo "Running migration $file"
  # Ignore errors – objects may already exist
  psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$file" || echo "Migration $file failed (ignored)"
 done

# Run seed data (SQL file if present) – ignore failures (e.g., already seeded)
if [ -f /app/seeds/seed_data.sql ]; then
  echo "Running seed data"
  psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f /app/seeds/seed_data.sql || echo "Seed script failed (ignored)"
fi

# Start the server
npm start
export PGPASSWORD="$DB_PASSWORD"

# Run raw SQL migrations (all .sql files in /app/migrations)
for file in /app/migrations/*.sql; do
  echo "Running migration $file"
  psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$file"
  if [ $? -ne 0 ]; then
    echo "Migration $file failed"
    exit 1
  fi
done

# Run seed data (SQL file if present)
if [ -f /app/seeds/seed_data.sql ]; then
  echo "Running seed data"
  psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f /app/seeds/seed_data.sql || echo "Seed script failed (might be already seeded)"
fi

# Start the server
npm start
for file in /app/migrations/*.sql; do
  echo "Running migration $file"
  psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$file"
  if [ $? -ne 0 ]; then
    echo "Migration $file failed"
    exit 1
  fi
done

# Run seed data (SQL file if present)
if [ -f /app/seeds/seed_data.sql ]; then
  echo "Running seed data"
  psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f /app/seeds/seed_data.sql || echo "Seed script failed (might be already seeded)"
fi

# Start the server
npm start
# Start the server
npm start
