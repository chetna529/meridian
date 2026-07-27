#!/bin/sh
set -e

host="${DATABASE_HOST:-postgres}"
port="${DATABASE_PORT:-5432}"

until nc -z "$host" "$port"; do
  echo "Waiting for Postgres at $host:$port..."
  sleep 1
done

echo "Postgres is available."

if [ -d "./prisma/migrations" ]; then
  echo "Prisma migrations directory found. Running migrate deploy..."
  npx prisma migrate deploy
else
  echo "No Prisma migrations directory in build context. Running prisma db push..."
  npx prisma db push --accept-data-loss
fi

exec npm start
