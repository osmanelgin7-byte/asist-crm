# Asist On

Sigorta şirketlerinin asistans operasyonlarını yönetmek için operasyon paneli (FlowCRM tabanlı).

## Özellikler

- **Asistans dosyaları** — vaka takibi, koordinatör ataması, operatör notları
- **Muhataplar** — sigorta şirketi ve lokasyon bilgileri
- **Maliyet onayları** — sigortaya sunulacak maliyet teklifleri
- **Hizmet sağlayıcılar** — anlaşmalı çekici, servis, konaklama vb. cari takibi
- **Ekspertiz / tespit** — saha değerlendirme kayıtları
- **Sigorta faturaları** — kapanan dosyaların fatura birleştirme
- **İK, planlayıcı, raporlama** — ortak modüller

## Kurulum

```bash
cd ~/Projects/asist-crm
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Port **3000**. Örnek giriş: `admin` / `admin123`

Harici API (opsiyonel):

```bash
npm run dev:backend   # port 4000
```

## Terminoloji

| Perakende CRM | Asistans CRM |
|---------------|--------------|
| Mağaza | Muhatap |
| Marka | Sigorta şirketi |
| Talep kaydı | Asistans dosyası |
| Teklif | Maliyet onayı |
| Tedarikçi | Hizmet sağlayıcı |
| Tespit | Ekspertiz |
| Planlayıcı | Dosya koordinatörü |

## Kaynak proje

`/Users/osman/Projects/flowcrm` — bakım/perakende odaklı orijinal sürüm.
