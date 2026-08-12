# Analisaku Signal API

Arsitektur:

`Private Pine Script (TradingView) -> TradingView Alert -> Cloudflare Worker -> KV -> Analisaku.com Decision Panel`

Pine Script tidak disimpan di repository publik. Repository hanya menyimpan frontend dan template API generik.

## Cloudflare Worker

Gunakan `backend/cloudflare-worker.js` sebagai source Worker.

Bindings yang dibutuhkan:

- KV namespace dengan binding name: `SIGNALS`
- Worker secret: `WEBHOOK_TOKEN`

Jangan commit nilai `WEBHOOK_TOKEN` ke GitHub.

Setelah Worker di-deploy, tersedia endpoint:

- `POST /webhook/<WEBHOOK_TOKEN>` — penerima alert TradingView
- `GET /signal?ticker=RAJA&timeframe=D` — dibaca Decision Panel
- `GET /health` — health check

## Hubungkan website

Edit `assets/js/signal-config.js` dan isi URL endpoint GET publik, contoh:

```js
window.ANALISAKU_SIGNAL_API = "https://nama-worker.workers.dev/signal";
```

Tidak boleh ada secret/token pada file tersebut karena GitHub Pages bersifat publik.

## Hubungkan TradingView

1. Gunakan Pine `ANALISAKU_MASTER_V1_1_WEBHOOK_TOKEN_SAFE`.
2. Pada input indikator, aktifkan `Aktifkan Website Alert`.
3. Buat alert pada indikator dan pilih `Any alert() function call`.
4. Isi Webhook URL dengan `https://nama-worker.workers.dev/webhook/<WEBHOOK_TOKEN>`.
5. Master Signal hanya mengirim output generik: ticker, timeframe, trend, setup, status, entry, trigger, invalidation, target, harga, dan timestamp.

Nama metode/formula internal tidak dikirim ke website.

## Status publik

Decision Panel mengenali:

- WAIT
- WATCH
- BUY SETUP
- HOLD
- TAKE PROFIT
- EXIT

Materi dan output bersifat analisis/edukasi dan bukan rekomendasi transaksi.
