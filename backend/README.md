# Analisaku Signal API

Backend ini menjadi penghubung antara mesin sinyal privat dan website publik Analisaku.com.

## Status deployment

Worker produksi dikelola langsung di Cloudflare. File `backend/cloudflare-worker.js` di repository ini dapat tertinggal dari versi produksi dan **tidak boleh langsung dideploy untuk menimpa Worker live tanpa dibandingkan lebih dulu dengan source terbaru di Cloudflare**.

## Prinsip publik

- Website dan endpoint publik hanya menampilkan **hasil analisis** yang dibutuhkan pengguna.
- `Score` termasuk hasil publik.
- Cara menghasilkan Score dan seluruh metodologi mesin tetap privat.
- Source strategi, parameter, formula, konfigurasi internal, serta logika proprietary tidak dijelaskan di repository publik.
- Secret webhook hanya disimpan pada Cloudflare Worker secret dan tidak pernah ditempatkan di frontend.

## Output yang boleh tampil

Output publik dapat berupa ticker, timeframe, score, trend, radar, decision, area keputusan, level risiko/target, status sinyal teknikal secara umum, dan waktu pembaruan.

Semua data selain whitelist output publik harus tetap berada di sisi privat dan tidak dikirim ke browser.
