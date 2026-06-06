<div align="center">

# Modulr

### Front-End Mechanics Playground

A hyper-reactive, **zero-backend** single-page app for mastering the mechanics behind modern front-end UI — CSS layout, SVG path geometry, and physical glass/neumorphic lighting. Everything runs in the browser and the **entire session state lives in the URL**, so sharing your work is just copying a link.

[**Live Demo**](https://mtssilva.github.io/modulr/) · [Report a bug](https://github.com/mtssilva/modulr/issues)

</div>

---

## ✦ Features

Modulr ships three interactive tool zones, each with its own accent identity:

### 1. Two-Way Semantic Layout Engine `Electric Blue`

A split-screen flexbox & box modeler with genuine **two-way data binding**:

- Edit CSS inline — `display`, `flex-direction`, `justify-content`, `align-items`, `flex-wrap`, `gap`, plus per-child `flex`, `align-self` — via tokens embedded directly in the simulated IDE.
- **Drag to resize** the parent container or any child box; the numeric CSS values update live.
- **Drag to reorder** child boxes with grip handles — the structural order rewrites instantly.
- **Edge alignment activators** flash the corresponding CSS line in neon when toggled.

### 2. SVG Path Anatomy Explainer `Neon Purple`

A visual compiler that demystifies vector geometry:

- Parses `M`, `L`, `C`, `Q`, `Z` commands from any `d="..."` string.
- Injects **draggable handle nodes** for every coordinate — color-coded anchors vs. bezier control arms, with dotted guide lines.
- Two-way: drag a node → the path string updates; type in the string → handles move. Snaps to a 10×10 grid.
- A live **tracking HUD** follows your pointer with command + coordinate readouts.

### 3. High-Impact Lighting Studio `Emerald Cyan`

A spatial lighting engine driven by real vector math:

- Drag the glowing **Light Source Orb** around the stage; the app computes the distance/angle vector from the card center continuously.
- **Neumorphism mode** maps the light vector into multi-layered `box-shadow` (dark shadow opposes the light, soft highlight follows it).
- **Glassmorphism mode** blends `backdrop-filter: blur()`, alpha layers, and a specular gradient that tracks the incoming ray angle.
- A clean, copyable **code-generation panel** outputs formatted CSS.

### ✦ Serverless Share System

The global state object is diffed against defaults, JSON-encoded, and packed into a URL-safe token stored in the location hash (`#state=…`). The **Share** modal builds the full link and copies it with a satisfying "Copied!" micro-animation. Open any shared link and the app deeply rehydrates — no database, no API, ever.

---

## ✦ Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (dark theme, custom accent tokens, physics-based easing)
- `requestAnimationFrame`-batched pointer dragging for locked 60fps interactions
- Deployed to **GitHub Pages** via GitHub Actions

---

## ✦ Local Development

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:5173)
npm run dev

# Type-check + production build
npm run build

# Preview the production build
npm run preview

# Lint
npm run lint
```

> Requires Node 18+.

---

## ✦ Deployment (GitHub Pages)

This repo auto-deploys on every push to `main` via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. In your repo: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Push to `main`. The workflow builds with the correct base path (`/<repo>/`) and publishes `dist/` to Pages.

The Vite `base` is resolved from the `BASE_PATH` env var (set automatically in CI to `/<repo>/`). To build for a custom path locally:

```bash
BASE_PATH=/my-path/ npm run build
```

---

## ✦ Project Structure

```
modulr/
├─ .github/workflows/deploy.yml   # CI → GitHub Pages
├─ public/favicon.svg
├─ src/
│  ├─ App.tsx                     # Navigation hub + module switcher
│  ├─ main.tsx
│  ├─ index.css                   # Tailwind + premium theme
│  ├─ components/                 # Icons, Share modal
│  ├─ lib/                        # Accents, rAF pointer-drag factory
│  ├─ state/                      # Types, defaults, (de)serialization, context
│  └─ modules/
│     ├─ layout/                  # Module 1 — Layout Engine
│     ├─ svg/                     # Module 2 — SVG Anatomy
│     └─ lighting/                # Module 3 — Lighting Studio
├─ index.html
├─ tailwind.config.js
└─ vite.config.ts
```

---

## ✦ License

[MIT](LICENSE) © Matheus Silva
