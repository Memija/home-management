# Home Management 🏠

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Memija_home-management&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Memija_home-management)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Memija_home-management&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Memija_home-management)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Memija_home-management&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=Memija_home-management)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Memija_home-management&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=Memija_home-management)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=Memija_home-management&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=Memija_home-management)
[![Angular](https://img.shields.io/badge/Angular-21-dd0031.svg?logo=angular)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-6e9f18.svg?logo=vitest)](https://vitest.dev)
[![License: Prosperity-3.0.0](https://img.shields.io/badge/License-Prosperity%203.0.0-blue.svg)](./LICENSE.md)

An enterprise-grade, privacy-first progressive web application built with **Angular 21 (Signals & SSR)** to monitor, analyze, and forecast household utility consumption (**water**, **electricity**, and **heating**). Engineered with a responsive design system, client-side OCR for meter scanning, statistical prediction algorithms, offline-first local persistence with optional Firebase Cloud synchronization, and an automated multi-layer security and quality pipeline.

---

## ✨ Features

### 💧 Water Tracking
- **Granular Meter Logging**: Track **Warm and Cold** water usage independently for both **Kitchen and Bathroom** meters.
- **Cold Water Only Mode**: Streamlined single-meter mode for households without separate warm water sub-meters.
- **Meter Replacement Handling**: Intelligently detects and manages meter replacements or counter resets without distorting historical deltas.
- **Anomaly & Spike Alerts**: Identifies unusual spikes in consumption to alert users to potential leaks or faucet anomalies early.

### ⚡ Electricity Monitoring
- **Kilowatt-Hour (kWh) Logging**: Accurately log meter readings and inspect trends across days, weeks, months, or billing periods.
- **Household & Per-Capita Breakdown**: Dynamically divides consumption by household member count to reveal individual daily habits.
- **Meter Swap Tracking**: Confirms and adjusts for physical electric meter upgrades or replacements seamlessly.
- **Country Benchmark Comparisons**: Compare your household's electricity usage directly against national averages across multiple countries.

### 🔥 Heating Management
- **Dynamic Room Architecture**: Add, rename, configure, and remove radiators or rooms dynamically (e.g., Living Room, Bedroom, Office).
- **Per-Room Energy Insights**: Track exactly how much heating energy each room consumes and identify heat distribution imbalances.
- **Room-Level Spike Detection**: Highlights sudden spikes in heating per room to detect open windows, faulty valves, or thermal leaks.

### 📊 Interactive Visualization (Chart.js & ng2-charts)
- **Multi-Series Comparison**: Overlay different meters, rooms, or resource types on synchronized timelines.
- **Pan & Zoom Controls**: Smooth drag-and-zoom controls powered by `chartjs-plugin-zoom` for granular inspection of spikes.
- **Display Modes**: Effortlessly switch between **Cumulative** (total meter progression) and **Period / Delta** (interval usage) modes.
- **Household vs. Per-Person**: Toggle between total consumption and normalized per-capita daily figures.
- **Dynamic Trendlines & Benchmarks**: Real-time trendline calculations and country-level comparison lines for context.
- **Dual Fullscreen Modes**: Supports browser-native Fullscreen API with automatic CSS-based fallback mode for maximum viewing comfort.

### 📸 Client-Side OCR Meter Reading (Tesseract.js)
- **Zero-Friction Capture**: Take a photo using your device's camera or upload an existing image of analog or digital utility dials.
- **100% Client-Side Privacy**: OCR runs entirely inside your browser via web workers—no meter photos or personal data ever leave your device.
- **Calibration & Verification Wizard**: Multi-step modal allows manual fine-tuning, image rotation, and verification before persisting readings.

### 🧠 Predictive Analytics & Forecasting
- **Statistical Prediction Engine**: Computes historical burn rates, linear regressions, and moving averages to project future consumption.
- **Seasonal Adjustments**: Factors in seasonal variations (e.g., higher heating demand in winter, increased water usage in summer).
- **Target Budgeting**: Set consumption targets and view projected end-of-period totals to proactively prevent bill shocks.

### 📋 Smart Clipboard & Text Import
- **Unstructured Text Parsing**: Paste messy meter logs, SMS notifications, or billing emails directly into the app.
- **Intelligent Pattern Matching**: Automatically detects dates (in various international formats) and meter values, mapping them directly into structured entries.

### 📁 Bi-Directional Excel & PDF Portability
- **Excel Import / Export (`.xlsx`)**: Export your complete historical records or import from spreadsheets with custom column mapping and validation.
- **Publication-Ready PDF Reports**: Generate beautifully formatted, branded PDF summaries with charts and summary tables via `jspdf` and `jspdf-autotable`.

### 🌳 Adaptive Seasonal Experience & Modern UI
- **Interactive Nature Tree**: A procedural seasonal canvas visualization that reacts dynamically to real-time calendar seasons (blooming flowers in Spring, lush greenery in Summer, falling foliage in Autumn, snowflakes in Winter) or user override.
- **Curated Themes**: Full dark and light theme parity built with modern SCSS tokens and crisp [Lucide Angular](https://lucide.dev/) icons.
- **A11y & Responsiveness**: Mobile-first, fully responsive layouts adhering to accessibility standards (keyboard navigation, aria-labels).

### 🎮 Interactive Demo Mode & Onboarding
- **Instant Sandbox**: Explore all features instantly with rich, realistic mock datasets without any setup.
- **Safe Data Isolation**: Real user data is safely preserved in an in-memory backup and restored automatically upon exiting demo mode.
- **Interactive Tours & Wizards**: Guided step-by-step walkthroughs for first-time users.

### ☁️ Hybrid Offline-First Storage & Cloud Sync
- **Local-First by Default**: Works offline without an internet connection using browser `LocalStorage`.
- **Optional Cloud Synchronization**: Sign in with Google via **Firebase Authentication** to synchronize records across multiple devices using **Cloud Firestore**.
- **Data Ownership**: Export, clear, or migrate your data at any time with complete data sovereignty.

### 🌍 Multi-Language Internationalization (i18n)
- Seamless multilingual support across 6 languages:
  - 🇬🇧 **English** (`en`)
  - 🇩🇪 **German** (`de`)
  - 🇧🇦 **Bosnian** (`bs`)
  - 🇷🇸 **Serbian** (`sr`)
  - 🇮🇩 **Indonesian** (`id`)
  - 🇵🇱 **Polish** (`pl`)
- Full localization of dates, unit measurements (m³, kWh, liters), decimal separators, and complex pluralization rules.

---

## 🏗️ Architecture & Key Technical Decisions

The application adheres to clean-code principles, modular architecture, and modern Angular standards:

1. **Angular 21 Standalone & Signals**:
   - Zero legacy `NgModules`. Every component, directive, and pipe is standalone.
   - Reactive state is driven by **Angular Signals** (`signal`, `computed`, `effect`) and signal inputs/outputs, eliminating complex RxJS subscription state management.
2. **Server-Side Rendering (SSR) & Client Hydration**:
   - Built with `@angular/ssr` and Express to ensure fast Initial Server Response and first contentful paint.
   - Client hydration with Event Replay (`provideClientHydration(withEventReplay())`) ensures seamless user interaction during bootstrap.
3. **Strict Separation of Concerns**:
   - Every component enforces strict file separation (`.ts` logic, `.html` markup, `.scss` scoped styles) with a strict file length target (< 300 lines) and DRY reusable components in `src/app/shared/`.
4. **Repository & Hybrid Storage Pattern**:
   - An abstracted `StorageService` interface backed by `HybridStorageService` provides cache-first local reads with background cloud persistence.
5. **Vitest Test Suite**:
   - Uses `@angular/build:unit-test` powered by **Vitest** and `jsdom` for near-instant unit test execution and V8 coverage reporting.
6. **Privacy-Preserving Edge Processing**:
   - Meter OCR (Tesseract.js) and file parsers run strictly within the client browser. No camera feeds or financial consumption metrics are passed to unvetted third-party APIs.

---

## 📂 Project Structure

```text
home-management/
├── .github/workflows/          # CI/CD pipelines (SonarCloud, CodeQL, ZAP DAST, Trivy, OSV, etc.)
├── scripts/                    # Security scanners, Lighthouse flows, and Firebase config generators
├── src/
│   ├── app/
│   │   ├── changelog/          # In-app version release history and notes
│   │   ├── components/         # Global navigation and language switchers
│   │   ├── config/             # Runtime Firebase credentials (gitignored in dev)
│   │   ├── dashboard/          # Central tracker hub and resource cards
│   │   ├── electricity/        # Electricity tracker (kWh logging, benchmarks)
│   │   ├── heating/            # Heating tracker (dynamic room meters, anomaly checks)
│   │   ├── i18n/               # Translation bundles (en, de, bs, sr, id, pl) & plural rules
│   │   ├── landing/            # Responsive public landing page and feature showcase
│   │   ├── layout/             # Application shell layout, header, and footer
│   │   ├── models/             # Domain models, calculation contracts, and TypeScript schemas
│   │   ├── pipes/              # Custom pipes (TranslatePipe, date formatting)
│   │   ├── privacy/            # Privacy policy and local data handling guidelines
│   │   ├── release-plan/       # Interactive roadmap and planned features
│   │   ├── services/           # Core domain services (storage, predictions, OCR, auth, averages)
│   │   ├── settings/           # Household, address, cloud sync, and Excel mapping settings
│   │   ├── shared/             # Reusable UI components (charts, modals, inputs, nature tree)
│   │   └── water/              # Water tracker (kitchen/bath, cold-water-only, spike alerts)
│   ├── environments/           # Environment profiles (production, development)
│   ├── styles/                 # Global design system partials (_variables, _buttons, _modal, etc.)
│   ├── main.server.ts          # Server-Side Rendering entry point
│   ├── main.ts                 # Browser client bootstrap
│   └── server.ts               # Express SSR application server
├── angular.json                # Angular CLI workspace configuration
├── package.json                # Project dependencies and operational scripts
└── sonar-project.properties    # SonarCloud quality analysis rules
```

---

## 📖 How to Use

### 1. Initial Setup & Household Profile
- Navigate to **Settings** (`/dashboard/settings`).
- Configure your **Household Members** (names and count) and optional address. Setting household size enables accurate per-capita calculations and comparison benchmarks.

### 2. Recording Consumption
Navigate to **Water**, **Electricity**, or **Heating** from the dashboard:
- **Manual Input**: Type current meter readings; deltas and rates are calculated automatically.
- **Camera / Image OCR**: Click the camera icon to snap or upload a picture of the meter. Confirm the reading in the review dialog.
- **Smart Import**: Click the clipboard icon and paste copied text containing dates and values.

### 3. Analyzing Trends & Benchmarks
- Use the **Interactive Chart** at the top of each utility page:
  - Toggle between **Cumulative** and **Period / Delta** views.
  - Switch between **Total Household** and **Per Person** figures.
  - Turn on **Trendlines** to project direction.
  - Compare against **Country Averages** to see how your consumption ranks.
  - Click **Fullscreen** for deep-dive investigation.

### 4. Forecasting & Targets
- Open the **Predictions Panel** on any resource page to inspect projected usage for upcoming cycles based on historical demand and seasonal shifts.

### 5. Data Backup, Export & Cloud Sync
- **Local Backups**: Export your data to Excel (`.xlsx`) or export visual summaries to PDF.
- **Cloud Sync**: Toggle on **Cloud Sync** in Settings to authenticate with Google. Migrate your existing local records to the cloud with one click for continuous multi-device sync.

---

## 🛠️ Local Development

### 📋 Prerequisites
- **Node.js**: `v20.x` or later (LTS recommended)
- **npm**: `v11.x` or later
- **Angular CLI**: `npm install -g @angular/cli`

### 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Memija/home-management.git
   cd home-management
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm start
   ```
   Open your browser at `http://localhost:4200/`. The app reloads automatically on code changes.

4. **Run Server-Side Rendering (SSR) locally:**
   ```bash
   npm run build
   npm run serve:ssr:home-management
   ```

---

## 🧪 Available Scripts

| Category | Script | Description |
| :--- | :--- | :--- |
| **Development** | `npm start` | Launches dev server with automatic Firebase config pre-check |
| | `npm run build` | Builds SSR application bundle and generates client-side fallback |
| | `npm run watch` | Builds application in watch mode for development |
| **Testing** | `npm test` | Executes unit tests via Vitest with jsdom |
| | `npm run test:coverage` | Runs Vitest tests with V8 coverage reporting (`lcov` and text) |
| **Code Quality** | `npm run lint` | Lints TypeScript and HTML via `angular-eslint` & `eslint` |
| | `npm run format` | Auto-formats code with Prettier |
| | `npm run format:check` | Verifies formatting without modifying files |
| **Performance** | `npm run test:lighthouse` | Executes Lighthouse CI audits for mobile and desktop |
| | `npm run test:lighthouse:flows` | Runs automated Lighthouse user-journey interaction flows |
| **Security** | `npm run security:all` | Executes full security scan suite (Trivy, OSV, Gitleaks, Zizmor, DAST) |
| | `npm run security:audit` | Audits dependencies for critical vulnerabilities (`npm audit`) |
| | `npm run security:secrets` | Scans codebase for leaked keys, tokens, and secrets |
| | `npm run security:socket` | Scans dependencies with Socket Security for supply-chain risks |
| | `npm run security:sbom` | Generates a CycloneDX Software Bill of Materials (`cyclonedx.sbom.json`) |
| | `npm run audit:licenses` | Validates dependency licenses against approved open-source list |
| **Pre-Flight** | `npm run validate` | Runs formatting, linting, secret checks, license audit, build, tests, and Lighthouse |

---

## 🛡️ Security & Quality Assurance Pipeline

This project employs a defense-in-depth security approach integrated into GitHub Actions CI/CD:

- **SonarCloud**: Static analysis, quality gate evaluation, code duplication, and maintainability metrics.
- **CodeQL**: Semantic analysis detecting security vulnerabilities and injection risks.
- **Aqua Trivy**: Scans repository filesystem and dependencies for known CVEs.
- **Google OSV-Scanner**: Identifies open-source vulnerabilities via the Google OSV database.
- **GitLeaks**: Prevents hardcoded secrets, credentials, and API tokens from entering git history.
- **OpenSSF Scorecard**: Automated evaluation of supply-chain security and repo hygiene.
- **Zizmor**: Security audit and misconfiguration analyzer for GitHub Actions workflows.
- **OWASP ZAP (DAST)**: Dynamic application security testing targeting active runtime endpoints.
- **CycloneDX SBOM**: Automated generation of Software Bill of Materials for dependency transparency.
- **Strict Content Security Policy (CSP)**: Hardened headers configured in dev-server and production hosting.

---

## 🚀 Firebase Deployment

The application is configured for deployment to **Firebase Hosting**.

### 📋 Prerequisites
```bash
npm install -g firebase-tools
npx firebase login
```

### 🔑 Firebase Configuration
For security reasons, `src/app/config/firebase.config.ts` is **gitignored**.

#### Option A: Manual Setup (Local Development)
Create `src/app/config/firebase.config.ts` manually:
```typescript
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

#### Option B: CI/CD Generation (Automated)
In CI/CD environments, supply Firebase keys as environment variables (`FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, etc.) and run:
```bash
npm run config:generate
```

### ⚡ Deploy Commands
Build and deploy to Firebase Hosting in one step:

- **PowerShell (Windows):**
  ```powershell
  npm run build; if ($?) { npx firebase deploy --only hosting }
  ```
- **Bash / Linux / macOS:**
  ```bash
  npm run build && npx firebase deploy --only hosting
  ```

---

## 🌐 Supported Languages

| Language | Code | Default Locale | Status |
| :--- | :---: | :---: | :---: |
| **English** | `en` | `en-US` | ✅ Full Support |
| **German** (Deutsch) | `de` | `de-DE` | ✅ Full Support |
| **Bosnian** (Bosanski) | `bs` | `bs-Latn-BA` | ✅ Full Support |
| **Serbian** (Srpski) | `sr` | `sr-RS` | ✅ Full Support |
| **Indonesian** (Bahasa Indonesia) | `id` | `id-ID` | ✅ Full Support |
| **Polish** (Polski) | `pl` | `pl-PL` | ✅ Full Support |

---

## ❤️ Community & Contributing

We warmly welcome contributions from the community!

- 📖 Review our [**Contributing Guidelines**](./CONTRIBUTING.md) to understand development standards, commit conventions, and pull request workflows.
- 🤝 Read our [**Code of Conduct**](./CODE_OF_CONDUCT.md) to maintain a respectful and welcoming environment.

---

## 📄 License & Commercial Terms

This project is licensed under the **Prosperity Public License 3.0.0**.

- **✅ Non-Commercial Use**: Completely free and open for personal, educational, and non-profit use.
- **⚠️ Commercial Use**: Includes a **30-day trial period**. Subsequent commercial use requires a dedicated license.
- **💡 Revenue Exemption**: Commercial licenses are only required for organizations or individuals whose gross annual revenue exceeds **$50,000 USD**.

For complete license terms, see [LICENSE.md](./LICENSE.md) and [COMMERCIAL.md](./COMMERCIAL.md).
