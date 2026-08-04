#!/usr/bin/env bash
# Setup local PostgreSQL database for Cronos (no Docker)
set -e

echo "Creating Cronos database user and database..."

psql postgres -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cronos') THEN
    CREATE USER cronos WITH PASSWORD 'cronos';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE cronos OWNER cronos'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cronos')\gexec

GRANT ALL PRIVILEGES ON DATABASE cronos TO cronos;
SQL

echo "✅ Database ready: postgresql://cronos:cronos@localhost:5432/cronos"
echo ""
echo "Next steps:"
echo "  cd backend && npm run db:push && npm run db:seed"
