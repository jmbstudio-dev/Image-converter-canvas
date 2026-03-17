# 🖼️ Image Converter

A fast, private, client-side image converter built with React + Vite. No login, no uploads, no server — everything runs directly in your browser.

> Got tired of looking for a good one on the internet, so I made a simple one. 👍

## ✨ Features

- 🔄 Convert images to **WebP, JPEG, PNG, BMP, AVIF**
- 🎚️ **Quality control** slider for lossy formats (WebP, JPEG, AVIF)
- 📦 Batch convert up to **20 files** at once — downloaded as a `.zip`
- 📊 **File size comparison** — see original vs converted size per image
- 🖱️ **Drag & drop** or click to upload
- ⚡ **Parallel conversion** — all files convert simultaneously
- 🔒 **100% private** — your images never leave your device

## 🛡️ Privacy

This tool is entirely client-side. No data is sent to any server. No analytics on your images. No storage. The conversion happens on your own device using the browser's built-in Canvas API.

## ⚠️ Known Limitations

- **AVIF** is supported on Chrome/Edge but may fail on Firefox or Safari — use WebP for broader compatibility
- Very large images (16,000×16,000px+) may fail silently due to browser canvas memory limits
- HEIC/HEIF (iPhone photos) are not currently supported as input

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation
```bash
git clone https://github.com/jmbstudio-dev/Image-converter-canvas.git
cd img-converter-v
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

## 🧰 Tech Stack

| Tool | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS v4 | Styling |
| Canvas API | Image conversion (no external deps) |
| JSZip | Bundling converted files into `.zip` |
| file-saver | Triggering browser download |
