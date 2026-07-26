# TriggerX Frontend

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.184-000000?style=flat-square&logo=three.js)](https://threejs.org/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-Deployed-F38020?style=flat-square&logo=cloudflare)](https://pages.cloudflare.com/)

The official web frontend for **TriggerX** — a real-time cryptocurrency price alerting platform for Binance Spot trading pairs. Built with React 19, Vite, Three.js 3D landing visuals, live WebSocket price streaming, and a high-performance Cyberpunk aesthetic UI.

---

## Key Features

- **Live WebSocket Price Streaming**: Directly connects to Binance WebSockets for sub-second price updates.
- **Interactive 3D Skull Visualizer**: Built using Three.js & React Three Fiber (`@react-three/fiber`, `@react-three/drei`) with GLSL shaders and matrix text rain.
- **Passwordless Auth**: OTP email authentication with responsive countdowns and modal privacy/terms integration.
- **Alert Management Dashboard**:
  - Live Bitcoin & Ethereum price ticker with custom stat cards
  - Multi-condition alert builder (`ABOVE`, `BELOW`, `CROSSES`)
  - Natural-language alert input mode
  - Integrations for Telegram Bot notifications and Chrome Extension
- **Cloudflare Pages Ready**: Native SPA routing via `_redirects` and custom HTTP security headers via `_headers`.

---

## Tech Stack

- **Core**: React 19, React Router 7, Vite 8
- **3D Graphics & Shaders**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **Styling**: Vanilla CSS Design System with HSL tokens, grain layers, and dark-mode glassmorphism
- **Utility & Tools**: ESLint 9, QR Code SVG generator

---

## Project Structure

```
triggerx-frontend/
├── public/
│   ├── _headers              # Cloudflare Pages HTTP headers configuration
│   ├── _redirects             # Cloudflare Pages SPA catch-all routing
│   ├── favicon.png / .svg    # Brand favicons
│   ├── hero.glb              # 3D Skull GLTF model asset
│   ├── manifest.json         # Web application manifest
│   └── robots.txt / sitemap  # SEO configuration
├── src/
│   ├── assets/               # Brand images and videos
│   ├── components/           # Reusable components (GrainLayer, HeroScene)
│   ├── pages/                # App pages (AuthPage, DashboardPage, LegalPages)
│   ├── utils/                # Video loader singletons
│   ├── App.jsx               # Main App routing & landing page
│   ├── App.css               # Landing page styles
│   ├── index.css             # Global design tokens and resets
│   └── main.jsx              # React DOM entry point & error boundary
├── index.html                # Entry HTML with preloads, splash screen, and JSON-LD
├── package.json              # Project dependencies & scripts
├── vite.config.js            # Vite build setup & dev proxy
└── README.md                 # Project documentation
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

```bash
git clone https://github.com/Shiva-Xs/triggerx-frontend.git
cd triggerx-frontend
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_API_BASE=http://localhost:8081
```

For production deployment (`.env.production`):

```env
VITE_API_BASE=https://api.triggerx.in
```

### Running Locally

Start the Vite development server with HMR:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Building for Production

To compile the production distribution bundle:

```bash
npm run build
```

The output will be generated in the `dist/` directory, complete with Cloudflare configuration files (`_redirects` and `_headers`).

To preview the production build locally:

```bash
npm run preview
```

---

## Deployment to Cloudflare Pages

This frontend is optimized for deployment on **Cloudflare Pages**.

### Method 1: Git Integration (Recommended)

1. Push your code to your GitHub repository.
2. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/).
3. Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
4. Select your `triggerx-frontend` repository.
5. Configure the Build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Add Environment Variable:
   - `VITE_API_BASE` = `https://api.triggerx.in`
7. Click **Save and Deploy**.

### Method 2: Direct Upload via Wrangler CLI

```bash
npx wrangler pages deploy dist --project-name=triggerx-frontend
```

---

## License & Support

- **Source Code**: Open Source
- **Contact**: `triggerx.notify@gmail.com`
- **Backend Repo**: [Shiva-Xs/triggerx-backend](https://github.com/Shiva-Xs/triggerx-backend)
