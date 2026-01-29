#!/bin/sh
set -e

echo "=============================================="
echo "🔄 Database Migration Script"
echo "=============================================="
echo "Environment: ${ASPNETCORE_ENVIRONMENT:-Production}"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

CONNECTION_STRING="${ConnectionStrings__DefaultConnection}"
MASKED_CONNECTION=$(echo "$CONNECTION_STRING" | sed 's/Password=[^;]*/Password=***/g')
echo "Connection String: $MASKED_CONNECTION"

if [ -z "$CONNECTION_STRING" ]; then
    echo "❌ ERROR: ConnectionStrings__DefaultConnection not set!"
    exit 1
fi

DB_SERVER=$(echo "$CONNECTION_STRING" | grep -oP 'Server=\K[^;,]+' | cut -d',' -f1)
DB_PORT=$(echo "$CONNECTION_STRING" | grep -oP 'Server=[^;]+,\K[0-9]+' || echo "1433")

echo "📡 Testing database connection on $DB_SERVER:$DB_PORT..."

MAX_RETRIES=60
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if nc -z "$DB_SERVER" "$DB_PORT" 2>/dev/null; then
        echo "✅ Database is reachable!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "⏳ Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ ERROR: Database not reachable"
    exit 1
fi

cd /src
echo "🚀 Applying migrations..."
dotnet ef database update --no-build --verbose
echo "✅ Migration completed successfully!"