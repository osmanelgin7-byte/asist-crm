# Asist On — Canlı Ortam (Production)

Asist On dosya yükleme ve SQLite kullanır. En pratik canlı kurulum **Docker** ile kalıcı disk/volume üzerindedir.

## Hızlı başlangıç (Docker)

### 1. Secret üretin

```bash
openssl rand -base64 32
```

### 2. Ortam dosyasını oluşturun

```bash
cp .env.production.example .env.production
```

`.env.production` içinde:

- `AUTH_SECRET` — ürettiğiniz secret
- `AUTH_URL` — canlı adres (ör. `https://crm.sirketiniz.com`)
- `SEED_ON_START=true` — ilk kurulumda örnek veri (sonra `false` yapın)

### 3. Build ve çalıştır

```bash
docker compose --env-file .env.production up -d --build
```

Uygulama: **http://localhost:3000** (veya sunucu IP’si)

### 4. İlk giriş

Seed açıksa:

| Kullanıcı | Şifre |
|-----------|-------|
| admin | admin123 |
| planlama | plan123 |
| ahmet | tek123 |

**Canlıda mutlaka şifreleri değiştirin.**

---

## VPS’e deploy (DigitalOcean, Hetzner, vb.)

1. Sunucuya Docker + Docker Compose kurun
2. Projeyi kopyalayın (`git clone` veya `rsync`)
3. `.env.production` dosyasını doldurun (`AUTH_URL` = domain)
4. `docker compose --env-file .env.production up -d --build`
5. Nginx/Caddy ile reverse proxy + HTTPS (Let’s Encrypt)

Örnek Caddy:

```
crm.sirketiniz.com {
  reverse_proxy localhost:3000
}
```

---

## Railway (Docker)

1. [railway.app](https://railway.app) — New Project → Deploy from GitHub repo
2. Root directory: `flowcrm`
3. **Volumes** ekleyin:
   - `/data` — veritabanı
   - `/app/uploads` — yüklenen evraklar
4. Environment variables:
   - `AUTH_SECRET`
   - `AUTH_URL` = Railway domain (ör. `https://flowcrm-production.up.railway.app`)
   - `DATABASE_URL` = `file:/data/flowcrm.db`
   - `SEED_ON_START` = `true` (ilk deploy)
5. Deploy

---

## Render (Docker)

1. New → Web Service → Docker
2. Persistent disk: `/data` ve `/app/uploads`
3. Aynı environment variables
4. Deploy

---

## Güncelleme

```bash
git pull
docker compose --env-file .env.production up -d --build
```

Veritabanı ve yüklemeler volume’da kalır.

---

## Yerel production testi

Docker olmadan:

```bash
npm run build
AUTH_SECRET="test-secret" AUTH_URL="http://localhost:3000" npm start
```

SQLite dosyası `prisma/dev.db`, yüklemeler `uploads/` klasöründe kalır.

---

## Sorun giderme

| Sorun | Çözüm |
|-------|--------|
| Giriş yapılamıyor | `AUTH_SECRET` ve `AUTH_URL` doğru mu kontrol edin |
| Veriler kayboldu | Volume mount edilmemiş olabilir |
| Dosya yüklenmiyor | `/app/uploads` volume’u bağlı mı |
| 500 hatası | `docker compose logs -f` ile logları inceleyin |
