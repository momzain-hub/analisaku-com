# Analisaku Signal API

Backend ini menjadi penghubung antara mesin sinyal privat dan website publik Analisaku.com.

Prinsip keamanan:

- Mesin, formula, parameter, bobot, threshold, periode indikator, dan source proprietary tidak disimpan atau dijelaskan di dokumentasi publik.
- Worker boleh menerima dan menyimpan data internal di KV untuk kebutuhan mesin.
- Endpoint `GET` publik hanya mengeluarkan output yang memang ditampilkan website.
- `Score` termasuk output publik. Komponen pembentuk Score tetap privat.
- Secret webhook wajib disimpan sebagai Cloudflare Worker secret dan tidak boleh ditulis di frontend atau repository.

Output publik yang diperbolehkan mencakup antara lain:

- ticker dan timeframe
- score
- trend / radar / decision
- entry area
- trigger
- invalidation
- target
- status Golden Cross secara umum
- waktu pembaruan

Tidak boleh diekspos melalui endpoint publik:

- nilai atau periode MA/EMA
- umur cross
- komponen score
- bobot dan threshold
- relative-volume / relative-strength internal
- parameter volatilitas internal
- rule atau formula engine
- source Pine / source strategi privat

Source Worker pada folder ini harus selalu menggunakan whitelist output publik sebelum data dikirim ke browser.
