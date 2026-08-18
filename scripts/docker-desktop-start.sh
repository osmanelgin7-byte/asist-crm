#!/bin/bash
set -e
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker bulunamadı. Önce Docker Desktop kurun:"
  echo "  https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker çalışmıyor. Docker Desktop uygulamasını açın ve tekrar deneyin."
  exit 1
fi

if [ ! -f .env.production ]; then
  cp .env.production.example .env.production
  echo ".env.production oluşturuldu — AUTH_SECRET değerini kontrol edin."
fi

echo "Norm Work On build ediliyor (ilk sefer 2-5 dk sürebilir)..."
docker compose --env-file .env.production up -d --build

echo ""
echo "Norm Work On hazır: http://localhost:3000"
echo "Giriş: admin / admin123"
echo ""
echo "Loglar:  docker compose logs -f"
echo "Durdur:  docker compose down"
