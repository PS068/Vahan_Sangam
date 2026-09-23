# 🚗 VahanSangam (AutoServe)
### *Next-Gen Digital Automotive Service Marketplace & Workshop Operations ERP*

<p align="center">
  <img src="https://img.shields.io/badge/React-18%2B-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <strong>VahanSangam</strong> bridges the gap between vehicle owners and verified independent garages through an intuitive consumer marketplace combined with a powerful, real-time Workshop Operating System (ERP / CRM).
</p>

---

## 🌟 Key Highlights & Ecosystem

```
                      ┌────────────────────────────────────────┐
                      │          VAHANSANGAM PLATFORM          │
                      └───────────────────┬────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     🧑‍💼 CAR & BIKE OWNERS (B2C)                     🏭 GARAGE OWNERS & WORKSHOPS (B2B)
 ┌────────────────────────────────────┐         ┌─────────────────────────────────────┐
 │ • Hyperlocal Garage Discovery      │         │ • Live Kanban Dispatch Board        │
 │ • Transparent Service Pricing      │         │ • Walk-in Intake & Job Cards        │
 │ • Real-Time Live Service Tracker   │ ◄─────► │ • Dynamic Service & Rate Catalog    │
 │ • Verified Reviews & Instant Slots │         │ • Digital Invoices & WhatsApp Share │
 │ • 1-Tap Google Authentication      │         │ • Workshop Intelligence Analytics   │
 └────────────────────────────────────┘         └─────────────────────────────────────┘
```

---

## ✨ Features

### 👤 For Vehicle Owners (B2C Marketplace)
- 🔍 **Hyperlocal Discovery**: Filter multi-brand garages by city, vehicle type (2-Wheeler, 4-Wheeler, EV, Commercial), ratings, and specific service categories.
- ⏱️ **Live Vehicle Status Tracker**: Real-time 6-stage Kanban workflow tracking:
  $$\text{Received} \longrightarrow \text{Inspecting} \longrightarrow \text{In Bay} \longrightarrow \text{Detailing} \longrightarrow \text{Ready} \longrightarrow \text{Delivered}$$
- 💳 **Transparent Cost Estimates**: View clear rate cards, estimated labor/parts charges, and seasonal discounts before booking.
- 🚨 **Direct Alerts & Communication**: Receive instant workshop alerts, inspection remarks, and completion notifications.
- 📄 **Digital Receipts & History**: Access complete service history and download digital invoices anytime.

---

### 🔧 For Garage Owners (B2B Workshop ERP & CRM)
- 📊 **Workshop Operations HQ**: Full-screen dispatch control center for active bays, mechanics, and open work orders.
- ⚡ **Walk-in Customer Intake**: Quick 30-second job card creation for non-app drive-in customers.
- 🛠️ **Custom Service Catalog Builder**: Set custom prices, labor rates, and promotional discounts on the fly.
- 📈 **Workshop Intelligence**:
  - Revenue analytics & Average Order Value (AOV)
  - Bay turnaround time & capacity utilization
  - Repeat customer retention metrics
- 🧾 **Digital Invoicing & Dispatch**: 1-click invoice printing, tax calculations, and WhatsApp customer dispatch.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 + Vite |
| **Routing** | React Router DOM v7 |
| **Styling & UI** | Tailwind CSS v4, Lucide Icons, Glassmorphism UI |
| **Backend / Database** | Firebase Cloud Firestore (Real-time updates) |
| **Authentication** | Firebase Google Auth + Role-Based Access Control (RBAC) |
| **Deployment** | Vercel / Netlify / Cloudflare Pages ready |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/your-username/vahansangam.git
cd vahansangam
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Firebase Configuration
Create a `.env` file or verify your Firebase configuration in [src/firebase.js](file:///c:/Users/nikhi/OneDrive/Desktop/Advance%20PS/Autoservenew%20str/src/firebase.js):
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173` to explore the app!

### 5. Build for Production
```bash
npm run build
```

---

## 📁 Project Structure

```
Autoservenew str/
├── public/                 # Static assets & favicons
├── src/
│   ├── assets/             # Images, illustrations, and media
│   ├── components/         # Reusable UI widgets, Navbars, Modals & Toast
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── ToastNotification.jsx
│   │   ├── CustomerAlertBanner.jsx
│   │   └── InvoicePrintAndDispatchModal.jsx
│   ├── context/            # Global Auth & App State Context
│   ├── data/               # Seed catalogs, mock services, and city data
│   ├── pages/              # Core Application Views
│   │   ├── Home.jsx             # Landing page & search portal
│   │   ├── Discover.jsx         # Search, filter & garage listings
│   │   ├── GarageDetail.jsx     # Individual garage profile & ratings
│   │   ├── BookService.jsx      # Multi-step booking checkout
│   │   ├── BookingDetails.jsx   # Live tracking interface for vehicle owner
│   │   ├── GarageDashboard.jsx  # Workshop Operations ERP & Kanban board
│   │   ├── GarageRegister.jsx   # Garage onboarding flow
│   │   └── MyAccount.jsx        # Customer profile & vehicle garage
│   ├── firebase.js         # Firebase client SDK initialization
│   ├── App.jsx             # Role-guarded route definitions
│   └── main.jsx            # React root mount
├── package.json
├── vite.config.js
└── index.html
```

---

## 🔒 Security & Role-Based Access Control (RBAC)

- **Public**: Anyone can browse garages, check service rates, and view ratings.
- **Customer Role**: Authenticated users can book slots, track vehicle live status, and manage their garage records.
- **Garage Owner Role**: Authenticated managers get access to the `/garage-dashboard` workshop dispatch desk, rate editor, and customer order management.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<p align="center">
  Made with ❤️ for modernizing automotive aftermarket care.
</p>
