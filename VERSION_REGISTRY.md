# Analisaku.com — Global Version Pattern Registry

Dokumen ini adalah registry versi untuk seluruh komponen utama Analisaku.com. Tujuannya agar setiap perubahan dapat dilacak, dibandingkan, dan di-rollback tanpa mencampur UI, logic, data, Worker, dan modul Wealth.

## Full-Site Baseline

**SITE v1.0 — STABLE BASELINE**  
Tanggal dikunci: **16 September 2026**  
Full-site baseline commit: `fc4796508100d00d83465e6a7cf3567b2ceb14fa`

Baseline ini mencakup kondisi website utama setelah:
- light theme putih tajam,
- typography global lebih crisp,
- Wealth live equity projection v1.9.2.9,
- Weekly Outlook slider,
- Technical Signal Monitor V2 + health monitor,
- Market Context frontend yang aktif pada repository saat baseline dikunci.

Instruksi **"kembali ke SITE v1.0"** berarti rollback penuh seluruh source website ke commit baseline tersebut. Gunakan hanya jika memang ingin mengembalikan seluruh website, bukan satu modul saja.

---

## Version Prefix Pattern

Gunakan prefix berikut untuk seluruh update berikutnya:

- `SITE vX.Y` — snapshot keseluruhan website.
- `UI vX.Y` — design system, theme, typography, spacing, component appearance.
- `WEALTH vX.Y.Z` — Wealth Management flow, questionnaire, allocation, projection, results.
- `WEALTH-PDF vX.Y.Z` — generator dan layout PDF Wealth.
- `TECH vX.Y` — Technical page / decision interface / signal monitor UI.
- `SIGNAL vX.Y` — pipeline signal, health monitor, data presentation.
- `WORKER vX.Y` — Cloudflare Worker/API.
- `MARKET vX.Y` — Market Context / Market Environment methodology + frontend integration.
- `WEEKLY vX.Y` — Weekly Outlook UI/slider behaviour.
- `DATA YYYY-MM` — content/data revision seperti Weekly Outlook bulanan.

### Aturan kenaikan versi

- **Patch** (`x.y.z`) — bugfix, cache, wording, compatibility; metodologi utama tidak berubah.
- **Minor** (`x.y`) — fitur baru atau perubahan behaviour bermakna tetapi masih kompatibel.
- **Major** (`x.0`) — perubahan arsitektur, alur, metodologi, atau design language besar.

Setiap versi stabil wajib memiliki:
1. nama versi,
2. tanggal,
3. commit acuan,
4. scope perubahan,
5. status: ACTIVE / STABLE / SUPERSEDED / ROLLED BACK,
6. rollback reference.

---

# Current Active / Stable Versions

## 1. Global Website

### SITE v1.0
- Status: **STABLE BASELINE**
- Commit: `fc4796508100d00d83465e6a7cf3567b2ceb14fa`
- Scope: snapshot penuh source website sebelum registry versioning diperluas.

## 2. UI / Design System

### UI v1.0
- Status: **ACTIVE / STABLE**
- Commit: `fc4796508100d00d83465e6a7cf3567b2ceb14fa`
- Registry detail: `DESIGN_PATTERN.md`
- Dark theme: Carbon Finance.
- Light theme: Crisp White.
- Typography: native system UI, high-clarity financial hierarchy.

## 3. Wealth Management

### WEALTH v1.10.0
- Status: **ACTIVE**
- Navigation/copy commit: `b29ee366f04631fa8964aa1a6b684380fcb96c96`
- Customer-facing copy commit: `8a8bbcb12ffd63f5accf9ec3bbec563b57c55c44`
- Bootstrap commit: `f5159b88369fd9e2d4c3cc3746f8a7040060ab38`
- Scope: penyederhanaan bahasa Wealth Management untuk nasabah tanpa mengubah formula, scoring, alokasi, projection engine, atau metodologi investasi.
- Perubahan utama: istilah internal seperti mode, kemampuan, kenyamanan, Product Fit, dan Future Value disederhanakan menjadi kebutuhan, kondisi keuangan, risiko & pengalaman, pilihan kelas aset, dan proyeksi nilai investasi.
- Rollback functional reference: `WEALTH v1.9.2.9`.

### WEALTH v1.9.2.9
- Status: **SUPERSEDED BY v1.10.0 / STABLE FUNCTIONAL ROLLBACK**
- Main loader commit: `44a81d7618cb0ba8bc734393381866140b61e217`
- Live projection fix commit: `acd6e688c8916f04beeca0039c12bdd8759b479b`
- Scope: live Equity Sleeve selection terhubung ke projection engine.

### WEALTH Instrument Mapping v1.9.2.7
- Status: **INCLUDED IN CURRENT WEALTH**
- Logic commit: `2a97060855e6c5158348635c09a72c24325542c9`
- Loader commit: `759519b4e394c837031a6f67921a8560279ee7d9`
- Scope: instrument ditampilkan per asset sleeve sehingga total allocation tetap 100%.

### WEALTH Product Allocation Sync v1.9.2.6
- Status: **SUPERSEDED BY v1.9.2.7+**
- Logic commit: `78e24bbd187123243c13d89400aea7b1585171d9`
- Loader commit: `3ff11c5ca6977135943efe78011defdfaca75d1b`

### WEALTH-PDF v1.9.2.5
- Status: **ACTIVE / STABLE PDF BASELINE**
- Layout commit: `b1ccdc0376362e0d9fec13f4d2c48b3136ba47bc`
- Loader commit: `1ec91aa430e2fbe62d3739576c680d8f51d3950c`
- Scope: PDF customer-facing yang rapi, readable, dan terstruktur.

### Wealth historical rollback chain

| Version | Status | Reference | Ringkasan |
|---|---|---|---|
| `v1.9` | Historical stable | `3cb1ebc9f95777d83f3f1a9c7607cafad6562ba1` | Professional brokerage UX baseline |
| `v1.9.1` | Historical stable | `869177eb0e6c9814aa26381514de1d3cfab4d6f6` | Visual refinement |
| `v1.9.2` | Stable rollback point | `7be70d9d2dc112a330124572c90ee5983fd91378` | Questionnaire persistence stable loader |
| `v1.9.2.1` | Superseded | `c2f39577627963c898378eae263ddbfb7b1cf1d3` | Questionnaire duplicate fix |
| `v1.9.2.2` | Superseded | `fefc034bbbbf292c7b69a21bbf4f4bf8ecde7f14` | Mobile PDF Blob download |
| `v1.9.2.3` | Superseded | `fdffbbc4a9327c5ec0565106921095e459e3c59c` | PDF viewer fallback |
| `v1.9.2.4` | Superseded | `f061aa80602e236c14f5fcf2a5c2ef9b51680c1e` | Direct DOM PDF generator |
| `v1.9.2.5` | Active PDF baseline | `1ec91aa430e2fbe62d3739576c680d8f51d3950c` | Polished PDF |
| `v1.9.2.7` | Included current | `759519b4e394c837031a6f67921a8560279ee7d9` | Grouped asset sleeve |
| `v1.9.2.8` | Superseded | `731cca010711eed956a9cab29e7942315fd66f94` | Equity Sleeve projection sync |
| `v1.9.2.9` | Functional rollback | `44a81d7618cb0ba8bc734393381866140b61e217` | Hard live projection sync |
| `v1.10.0` | Active | `f5159b88369fd9e2d4c3cc3746f8a7040060ab38` | Customer language refresh; logic unchanged |
| `v1.9.3` | Rolled back | `2069bbc6563c3d419337034a9a27df86f5db5fd8` | PDF feedback introduced loader regression |
| `v1.9.4` | Rolled back | `495174418d68e6872cdee5e7f4c34e326b5c091c` | Temporary bundle restore attempt |

## 4. Technical / Signal Monitor

### TECH Signal Monitor V2
- Status: **ACTIVE BASELINE**
- Direct-load commit: `9978d97d0b2e12a15a9e807ced6865ca5b5e828c`
- Versioned loader commit: `35e7de7553bebb3eab071c97b0684d3ba2f67f1e`

### SIGNAL Health Monitor — 40 ticker
- Status: **ACTIVE BASELINE**
- Initial 40-ticker health commit: `99d61ec46eb581a3f1021d861a0d3fcb0cb184ef`
- Loaded commit: `befe0b7858f3467ea8f711c6832eddeb2541b931`
- Compact layout refresh: `07395e5dc4f9f380091e69682830b2b249f12636`

## 5. Market Context / Backend

### WORKER v3.2-market-environment
- Status: **REPOSITORY BASELINE**
- Commit: `2070ee8aa5712bc94ea56a082e68882ab2bc4410`
- Source file currently declares: `3.2-market-environment`.
- Previous stable Worker: `v3.1-market-cleanup` at `d97dc418e1081744ac53339542cde3d1ccfc6d5f`.
- Catatan: jangan menganggap v3.3 sebagai repository baseline sampai source v3.3 benar-benar diverifikasi dan disinkronkan ke GitHub.

### MARKET Environment Method v1.0
- Status: **ACTIVE METHODOLOGY BASELINE**
- Backend scoring introduced: `2070ee8aa5712bc94ea56a082e68882ab2bc4410`
- Scope: Rupiah + Sector Leadership + Hot Issues, dengan minimum fresh components.

## 6. Weekly Outlook

### WEEKLY Slider v1.0
- Status: **ACTIVE**
- Navigation logic: `385e02bf0e09e402c47d5eed68fe24a754a72af8`
- Styling + all-weeks view: `c5414603e3dba4ba5dab00434dd798560d4873d7`
- Final direct homepage loading: `6b823fe92525f93dcab807cc01d462f11b5f34f7`

### DATA 2026-09
- September outlook update: `61a354b5d0dfde37c85942f2de0bfc34f946d1b3`

### DATA 2026-10
- October outlook update: `17fb5b777c6de68988b6d1e5393f7cd60f2bf195`

---

# Rollback Command Pattern

Gunakan instruksi yang eksplisit supaya tidak salah scope:

- **"Kembali ke SITE v1.0"** → seluruh source website ke snapshot full-site.
- **"Kembali ke UI v1.0"** → hanya visual/theme/typography.
- **"Kembali ke WEALTH v1.9.2.9"** → Wealth functional baseline sebelum customer language refresh.
- **"Kembali ke WEALTH-PDF v1.9.2.5"** → hanya PDF Wealth.
- **"Kembali ke TECH Signal Monitor V2"** → hanya Technical Signal Monitor.
- **"Kembali ke WORKER v3.2"** → hanya source Worker di repository; deployment production tetap perlu diverifikasi terpisah.
- **"Kembali ke WEEKLY v1.0"** → hanya UI/logic Weekly Outlook, data bulanan tidak otomatis dihapus kecuali diminta.

Jangan melakukan rollback silang antar-modul kecuali instruksi menyebutkannya secara eksplisit.

---

# Future Release Rule

Setiap perubahan berikutnya harus diberi label versi sebelum dinyatakan final. Contoh:

- perbaikan font → `UI v1.0.1` atau `UI v1.1` sesuai scope,
- perubahan questionnaire/copy Wealth → `WEALTH v1.10.1` / versi berikutnya,
- perbaikan PDF saja → `WEALTH-PDF v1.9.2.6`,
- update Worker → `WORKER v3.3`,
- slider Weekly baru → `WEEKLY v1.1`,
- update isi November → `DATA 2026-11`.

Registry ini harus diperbarui setiap kali sebuah versi dinyatakan **stable** atau dijadikan **rollback point**.
