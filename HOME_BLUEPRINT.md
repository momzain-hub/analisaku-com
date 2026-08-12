# Analisaku.com — Home Market Command Center Blueprint

Home berfungsi khusus untuk menjawab arah market dari atas ke bawah. Edukasi hanya berupa teaser singkat di bagian akhir.

## 1. IHSG Weekly Outlook
Pertanyaan yang dijawab: **Market minggu ini arahnya ke mana?**

Sumber: editorial/analisa internal Analisaku yang diperbarui mingguan.

Tampilan Home:
- Rentang minggu aktif saja.
- Bias mingguan.
- Outlook harian selama minggu aktif.
- `◆` = Key Timing Window.
- Tanggal hari berjalan otomatis diberi highlight `TODAY` berdasarkan Asia/Jakarta.
- Jika hari berjalan juga Key Timing Window: `TODAY • ◆ KEY WINDOW`.
- Hari libur: `MARKET CLOSED`.
- Weekly Call.
- Strategy.

Data disimpan di `assets/data/weekly-outlook.json` agar Home tidak perlu diedit setiap kali outlook berubah.

## 2. Market Pulse
Pertanyaan yang dijawab: **Kenapa outlook market seperti itu?**

Komponen V1:
- Foreign Flow — sumber utama BEI/IDX.
- Rupiah — sumber utama BI/JISDOR.
- Global Sentiment — market data global.
- Market Breadth — data pergerakan saham IDX.

Output akhir: `CONSTRUCTIVE / MIXED / DEFENSIVE`.

Tidak menampilkan angka palsu. Sampai feed data aktif, Home hanya menampilkan struktur/data-ready state.

## 3. Sector Leadership
Pertanyaan yang dijawab: **Uang sedang bergerak ke sektor mana?**

Sumber: indeks sektor IDX-IC / market data yang merepresentasikan sektor IDX.

Metode tampilan Home:
- Top 3 sektor terkuat.
- 1 sektor yang melemah.
- Fokus pada relative strength / momentum terhadap IHSG.

Tidak menampilkan ranking palsu sebelum feed resmi aktif.

## 4. Analisaku Watchlist
Pertanyaan yang dijawab: **Saham mana yang layak dipantau?**

Nama final: **ANALISAKU WATCHLIST**.

Sumber: Analisaku Engine / scanner proprietary.

Tampilan maksimal 5 saham:
- Ticker.
- Trend.
- Status: `WAIT / WATCH / BUY SETUP / HOLD / TAKE PROFIT / EXIT`.

Metodologi internal tidak ditampilkan di website.

## 5. Technical Quick View
Pertanyaan yang dijawab: **Kalau saham dipilih, level teknikalnya bagaimana?**

Home hanya menampilkan versi ringkas:
- Ticker + timeframe.
- Trend.
- Status.
- Entry area.
- Trigger.
- Invalidation.
- Target terdekat.
- Decision singkat.

Chart dan Decision Panel lengkap tetap berada di `technical.html`.

## 6. Edukasi Teaser
Hanya satu blok pendek di bagian akhir untuk mengarahkan pengguna yang ingin belajar ke `edukasi.html`.

## Final User Journey
`IHSG ke mana? → Kenapa? → Sektor mana? → Saham mana? → Level teknikalnya bagaimana? → Belum paham? Belajar.`
