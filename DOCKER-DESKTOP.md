# Asist On — Docker Desktop

## 1. Docker Desktop kur

1. [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) adresinden indir
2. `.dmg` dosyasını kur ve **Docker Desktop** uygulamasını aç
3. Menü çubuğunda balina ikonu yeşil olana kadar bekle

## 2. Asist On'u başlat

Terminalde:

```bash
cd ~/Projects/flowcrm
chmod +x scripts/docker-desktop-start.sh
./scripts/docker-desktop-start.sh
```

İlk build 2–5 dakika sürebilir. Bittiğinde:

**http://localhost:3000**

| Kullanıcı | Şifre |
|-----------|-------|
| admin | admin123 |
| planlama | plan123 |
| ahmet | tek123 |

## 3. Günlük komutlar

```bash
# Logları izle
docker compose logs -f

# Durdur
docker compose down

# Yeniden başlat (kod değişikliği sonrası)
docker compose --env-file .env.production up -d --build
```

## Notlar

- Veritabanı ve yüklenen dosyalar Docker volume’larında kalır (`flowcrm-data`, `flowcrm-uploads`)
- `docker compose down -v` **verileri siler** — dikkatli kullanın
- Port 3000 meşgulse `docker-compose.yml` içinde `"3001:3000"` yapıp `AUTH_URL=http://localhost:3001` güncelleyin
