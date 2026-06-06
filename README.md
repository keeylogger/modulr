<div align="center">

# ✨ Modulr

**The Front-End Mechanics Playground** — a hyper-reactive, zero-backend studio for mastering CSS layout, SVG path geometry, and glass / neumorphic lighting.

[![Build](https://github.com/mtssilva/modulr/actions/workflows/deploy.yml/badge.svg)](https://github.com/mtssilva/modulr/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](LICENSE)
![React](https://img.shields.io/badge/React-18-3b82f6?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-a855f7?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-2dd4bf?logo=tailwindcss&logoColor=white)

</div>

---

## 🧩 What is it?

Modulr turns abstract front-end concepts into things you can **grab and drag**. Three tools, one rule: edit either side — the code or the canvas — and the other updates instantly. The whole session lives in the URL, so sharing is just copying a link. No accounts, no servers. 🔗

## 🛠️ The Tools

| Tool | Accent | What you can do |
| --- | --- | --- |
| 🟦 **Layout Engine** | Electric Blue | Two-way flexbox/box modeler. Tweak inline CSS tokens, drag-resize boxes, and reorder them like puzzle pieces that slide around the one you're holding. |
| 🟣 **SVG Anatomy** | Neon Purple | Parse any `M / L / C / Q / Z` path into draggable, color-coded anchors & bezier arms. Add nodes, delete them, and shift-select two anchors to **join** ends. |
| 🟢 **Lighting Studio** | Emerald Cyan | Drag a glowing light orb to drive real vector math into multi-layer `box-shadow` (neumorphism) or `backdrop-filter` glass with an adjustable specular reflection. |

## ⚡ Highlights

- 🔗 **Serverless sharing** — full state is diffed against defaults, compressed into a URL-safe token, and rehydrated from `#state=…`.
- 🎯 **60 fps interactions** — every drag is `requestAnimationFrame`-batched; layout reorders use FLIP for buttery sliding.
- 🎨 **Premium dark UI** — translucent panels, physics-based easing, per-tool accent identities.
- 🧠 **Two-way binding everywhere** — the canvas and the generated code are always in sync.

## 🚀 Quick Start

```bash
npm install     # install dependencies
npm run dev      # start the dev server → http://localhost:5173
npm run build    # type-check + production build
npm run preview  # preview the production build
```

> Requires **Node 18+**.

## 📦 Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 |
| State | URL-hash (de)serialization, zero backend |

## 📄 License

Released under the [MIT License](LICENSE) © Matheus Silva.
