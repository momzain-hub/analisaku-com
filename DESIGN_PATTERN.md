# Analisaku.com — UI Pattern Version Registry

> Registry versi seluruh website sekarang berada di `VERSION_REGISTRY.md`. Dokumen ini khusus untuk baseline visual/UI.

## Current Baseline

**Pattern Version: UI v1.0**  
**Status: STABLE BASELINE**  
**Date locked: 16 September 2026**  
**Visual baseline commit: `fc4796508100d00d83465e6a7cf3567b2ceb14fa`**

Gunakan versi ini sebagai acuan tampilan utama Analisaku.com. Jika perubahan visual berikutnya terasa kurang sesuai, instruksi **"kembali ke UI Pattern v1.0"** berarti mengembalikan pola desain ke baseline ini tanpa mengubah logic/data aplikasi.

## Core Visual Pattern

### Dark Theme — Carbon Finance
- Background utama: navy/black carbon.
- Surface/card: dark navy bertingkat dengan border tipis.
- Heading: putih tegas.
- Body text: abu terang dengan kontras tinggi.
- Accent utama: gold/amber.
- Positive state: green.
- Tidak menggunakan glow/orb besar yang mengganggu konten.

### Light Theme — Crisp White
- Background utama: putih tajam `#ffffff`.
- Secondary surface: `#f8fafc`.
- Heading: near-black `#020617`.
- Body text utama: `#111827`.
- Secondary text: `#334155` / `#475569`.
- Border tipis neutral slate.
- Accent gold dibuat lebih gelap agar tetap tajam di background putih.

## Typography Pattern

- Font stack utama: native system UI.
- Prioritas: keterbacaan dan ketajaman rendering di Android, iOS, Windows, dan desktop browser.
- Heading: weight 800.
- Strong/value: weight sekitar 750.
- Button/navigation/label: weight sekitar 650.
- Body: medium-readable, tidak terlalu tipis.
- Small text tidak boleh terlalu pucat atau terlalu kecil.
- Tidak menggunakan text-shadow untuk teks informasi.

## UI Hierarchy

1. Eyebrow / section label — kecil, uppercase, gold.
2. Heading — besar, tegas, near-black/white sesuai tema.
3. Primary value — bold, mudah dipindai.
4. Supporting copy — lebih kecil tetapi tetap tajam.
5. Badge/status — rounded, border tipis, warna berdasarkan status.

## Card & Surface Pattern

- Radius moderat: ±10–14px untuk komponen umum.
- Border tipis lebih dominan daripada shadow.
- Shadow hanya sangat halus pada komponen prioritas.
- Spacing dibuat lega agar data finansial mudah dipindai.
- Card tidak menggunakan dekorasi yang lebih dominan daripada data.

## Financial UX Rules

- Angka utama harus lebih menonjol daripada label.
- Persentase, return, dan status positif/negatif harus terbaca sekilas.
- Keterangan risiko harus jelas dan tidak disembunyikan oleh styling.
- Data tabel/cards harus mempertahankan hierarki visual konsisten di mobile dan desktop.
- Light dan dark theme harus memiliki struktur identik; hanya token warna yang berubah.

## Versioning Rule

Perubahan ke depan menggunakan pola:

- `UI v1.0` — baseline stabil saat ini.
- `UI v1.1` — perubahan minor: font, spacing, warna, border, card kecil.
- `UI v1.2` — perubahan komponen/section yang lebih besar tetapi struktur utama sama.
- `UI v2.0` — redesign besar atau perubahan design language utama.

Setiap update visual berikutnya sebaiknya menyebut versi pattern baru agar rollback mudah dilakukan.

## Current Related Feature Versions

- Global UI Pattern: **v1.0**
- Wealth Engine: **v1.9.2.9**
- Wealth instrument grouping consistency: **v1.9.2.7+**
- Typography sharpness baseline: commit `fc47965`

Untuk daftar lengkap versi SITE, Wealth, PDF, Technical, Signal, Worker, Market, Weekly, dan Data gunakan `VERSION_REGISTRY.md`.

## Rollback Reference

Jika diminta:

**"Kembali ke pattern v1.0"**

maka acuan visual adalah kondisi repository pada commit:

`fc4796508100d00d83465e6a7cf3567b2ceb14fa`

Logic bisnis, market data, Worker, Pine, dan API tidak ikut dirollback kecuali diminta secara eksplisit.
