# Analisaku Signal API

Arsitektur:

`Private Pine Script / Signal Hub (TradingView) -> TradingView Alert -> Cloudflare Worker -> KV -> Analisaku.com Decision Panel`

Pine/engine tidak ditampilkan oleh website. Backend hanya menyimpan output generik yang dibutuhkan Decision Panel.

## Cloudflare Worker

Gunakan `backend/cloudflare-worker.js` sebagai source Worker.

Bindings yang dibutuhkan:

- KV namespace dengan binding name: `SIGNALS`
- Worker secret: `WEBHOOK_TOKEN`

Jangan commit nilai `WEBHOOK_TOKEN` ke GitHub.

Setelah Worker di-deploy, tersedia endpoint:

- `POST /webhook/<WEBHOOK_TOKEN>` — penerima alert TradingView
- `GET /signal?ticker=RAJA&timeframe=1D` — dibaca Decision Panel
- `GET /health` — health check

## Format webhook

Worker mendukung dua format secara bersamaan.

### Legacy / single signal

```json
{
  "ticker": "RAJA",
  "timeframe": "1D",
  "trend": "BULLISH",
  "setup": "ACTIVE",
  "status": "WATCH"
}
```

### Signal Hub batch

```json
{
  "signals": [
    {"ticker":"RAJA","timeframe":"1D","trend":"BULLISH","setup":"ACTIVE","status":"WATCH"},
    {"ticker":"BBCA","timeframe":"1D","trend":"NEUTRAL","setup":"INACTIVE","status":"WAIT"}
  ]
}
```

Satu batch dibatasi maksimal 40 signal. Data dengan key `ticker:timeframe` yang sama di dalam satu batch di-deduplicate sebelum KV ditulis.

## Signal Hub V1.4 — 20 ticker

Source:

`tradingview/ANALISAKU_SIGNAL_HUB_V1_4_20TICKER_BATCH.pine`

Default watchlist:

RAJA, BBCA, BMRI, BBRI, BBNI, TLKM, ASII, ANTM, AMMN, MDKA, TPIA, BUMI, BRMS, ADRO, PGAS, INCO, UNTR, ICBP, ITMG, GOTO.

Seluruh ticker dapat diganti dari Inputs TradingView tanpa mengubah kode.

Alur:

1. Hub menghitung 20 ticker pada timeframe chart yang sama.
2. Snapshot awal 20 ticker digabung menjadi satu payload `signals[]`.
3. Perubahan berikutnya hanya memasukkan ticker yang state/level pentingnya berubah setelah candle close.
4. Satu eksekusi menghasilkan maksimal satu `alert()` / satu webhook batch.
5. Worker memecah batch menjadi key KV per `ticker:timeframe`.

## Hubungkan website

`assets/js/signal-config.js` berisi endpoint GET publik Worker. Jangan meletakkan secret/token pada frontend.

## Hubungkan TradingView

1. Pasang `ANALISAKU_SIGNAL_HUB_V1_4_20TICKER_BATCH.pine` pada chart.
2. Validasi dulu output RAJA vs Master V1.2 dengan `Website Alert` masih OFF.
3. Setelah cocok, aktifkan `Aktifkan Website Alert` dan `Kirim Snapshot Awal 20 Saham`.
4. Buat satu alert pada Hub dan pilih `Any alert() function call`.
5. Gunakan Webhook URL `https://nama-worker.workers.dev/webhook/<WEBHOOK_TOKEN>`.
6. Message tidak perlu diisi JSON manual karena Pine mengirim payload dinamis melalui `alert()`.

## Status publik

Decision Panel mengenali:

- WAIT
- WATCH
- BUY SETUP
- HOLD
- TAKE PROFIT
- EXIT

Output bersifat analisis/edukasi dan bukan rekomendasi transaksi.
