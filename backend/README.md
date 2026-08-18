# Asist On Backend

Ayrı REST API sunucusu (harici entegrasyon, mobil uygulama vb.). Next.js web arayüzü **kendi `/api/*` route'larını** kullanır; bu sunucuya rewrite ile yönlendirilmez.

## Başlatma

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Sunucu varsayılan olarak **http://localhost:4000** adresinde çalışır.

Web arayüzü için yalnızca:

```bash
npm run dev
```

(proje kökünden, port 3000)

## Kimlik doğrulama

Next.js oturumundan bağımsız **JWT** kullanır.

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Yanıttaki `token` ile isteklerde:

```
Authorization: Bearer <token>
```

## Mevcut endpoint'ler

| Yol | Açıklama |
|-----|----------|
| `GET /health` | Sağlık kontrolü |
| `POST /api/auth/login` | Giriş |
| `GET /api/auth/me` | Oturum bilgisi |
| `GET/POST /api/stores` | Mağazalar |
| `PATCH /api/stores/:id` | Mağaza güncelle |
| `GET/POST /api/work-orders` | Talep kayıtları |
| `PATCH/DELETE /api/work-orders/:id` | Talep güncelle / sil |
| `GET/POST /api/work-orders/:id/operator-notes` | Operatör notları |
| `GET/POST /api/quotes` | Teklifler |
| `PATCH/DELETE /api/quotes/:id` | Teklif güncelle / sil |
| `GET/POST /api/job-types` | İş türleri |
| `PATCH/DELETE /api/job-types/:code` | İş türü güncelle / sil |
| `GET /api/search?q=` | Genel arama |
| `GET/POST /api/team-notes` | Toplantı masası |

Web arayüzündeki PDF, Excel export, onarım görselleri, tedarikçiler, İK vb. yalnızca Next.js `/api/*` üzerindedir.

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `PORT` | Dinleme portu (varsayılan 4000) |
| `DATABASE_URL` | Prisma bağlantısı (`file:../prisma/dev.db`) |
| `JWT_SECRET` | JWT imza anahtarı |
| `CORS_ORIGIN` | İzin verilen frontend kökeni |
