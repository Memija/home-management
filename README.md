# Home Management 🏠

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Memija_home-management&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Memija_home-management)

A modern, comprehensive web application for managing household resource consumption and family data. Track your water, electricity, and heating usage with ease and gain insights through beautiful, interactive charts.

---

## ✨ Features

- **💧 Water Tracking**: Record and monitor water consumption with granular detail. Track **Warm and Cold** water usage separately for both **Kitchen and Bathroom** to identify where your usage is highest.
- **⚡ Electricity Monitoring**: Keep an eye on your home's power usage by logging kilowatt-hour (kWh) readings. Stay informed about your energy footprint and track consumption over time.
- **🔥 Heating Management**: Track heating energy across different rooms with a **dynamic room-based system**. Monitor exactly how much energy each part of your home is using to optimize heating efficiency.
- **📊 Interactive Charts**: Visualize your trends over time with high-performance, interactive charts (powered by Chart.js). Features include **multi-series comparison**, **trendline analysis**, and **zoomable timeframes** for deep insights.
- **☁️ Cloud Sync**: Securely sync your data with **Firebase** or keep it entirely local. A **hybrid storage model** allows you to work offline using LocalStorage and manually or automatically sync your data for multi-device access.
- **🌍 Internationalization**: Built for a global audience with full support for multiple languages, including **English and German**. The app respects local formatting for dates, numbers, and units of measurement.

---

## 📖 How to Use

### 1. Initial Setup

Go to the **Settings** page to configure your household size and set up your preferences. This helps in calculating per-person consumption metrics and personalized insights.

### 2. Recording Data

Navigate to the **Water**, **Electricity**, or **Heating** sections to add new meter readings.

- Use the **Water** section for kitchen/bathroom warm and cold meter readings.
- Use the **Electricity** section for your main kWh meter.
- Use the **Heating** section to log energy usage room-by-room.

### 3. Analyzing Trends

Visit the **Dashboard** or specific resource pages to see your consumption trends. Use the interactive charts to zoom in on specific periods and identify patterns or potential leaks/waste.

### 4. Cloud Synchronization

To keep your data safe across devices, enable **Cloud Sync** in the settings. You can migrate your local data to the cloud at any time, ensuring you never lose your history.

---

## 🛠️ Local Development

Follow these steps to get a development environment running on your machine.

### 📋 Development Prerequisites

Ensure you have **Node.js** and **npm** installed. Then, install the Angular CLI globally:

```bash
npm install -g @angular/cli
```

### 🚀 Getting Started

1. **Clone the repository:**

    ```bash
    git clone https://github.com/Memija/home-management.git
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Start the development server:**

    ```bash
    npm start
    ```

4. **Access the application:**

    Open your browser and navigate to `http://localhost:4200/`. The app will automatically reload when you save changes.

---

## 🚀 Firebase Deployment

This project is optimized for deployment to **Firebase Hosting**.

### 📋 Deployment Prerequisites

Ensure you have the Firebase CLI installed and are logged in:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to your Google Account
npx firebase login
```

### 🔑 Firebase Configuration

For security reasons, the Firebase configuration file (`src/app/config/firebase.config.ts`) is **gitignored**. You must provide this file for the application to connect to your Firebase project.

#### Option A: Manual Setup (Local Development)

Create the file manually at `src/app/config/firebase.config.ts` with your project keys:

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

#### Option B: CI/CD Generation (Automated)

If you are deploying via a CI/CD pipeline (like GitHub Actions), you can use the included generation script to create the config from environment variables:

```bash
# Set FIREBASE_API_KEY, FIREBASE_PROJECT_ID, etc. as secrets
npm run config:generate
```

### ⚡ One-Command Deployment (Recommended)

Run the production build and deployment in a single sequence:

**For PowerShell (Windows):**

```powershell
npm run build; if ($?) { npx firebase deploy --only hosting }
```

**For Bash / CMD:**

```bash
npm run build && npx firebase deploy --only hosting
```

---

## ❤️ Community

We welcome contributions of all kinds! Please check out our:

- [**Contributing Guidelines**](./CONTRIBUTING.md) to understand how to get started and how we handle commercial-safe contributions.
- [**Code of Conduct**](./CODE_OF_CONDUCT.md) for our standards on community behavior.

---

## 📄 License & Commercial Terms

This project is licensed under the **Prosperity Public License 3.0.0**.

- **✅ Non-Commercial Use**: Free and open for personal, educational, and non-profit use.
- **⚠️ Commercial Use**: Includes a **30-day trial period**. Subsequent use requires a separate **Commercial License**.
- **💡 Revenue Threshold**: Commercial licenses are only required for revenue exceeding **$50,000 USD** per year.

See [LICENSE.md](./LICENSE.md) and [COMMERCIAL.md](./COMMERCIAL.md) for full terms and contact details.
