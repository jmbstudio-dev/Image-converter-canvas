# 🖼️ Image Tools
VIEW LIVE: https://image-tools-mu.vercel.app/

A fast, private, client-side image toolkit built with React + Vite. No login, no uploads, no server — everything runs directly in your browser.

> Got tired of looking for a good one on the internet, so I made a simple one. 👍

## ✨ Features

### 🔄 Converter
- Convert images to **WebP, JPEG, PNG, BMP, AVIF**
- 🎚️ **Quality control** slider for lossy formats (WebP, JPEG, AVIF)
- 📊 **File size comparison** — see original vs converted size per image
- 📦 Batch convert up to **20 files** at once — downloaded as a `.zip`
- ⚡ **Parallel conversion** — all files convert simultaneously

### 🗜️ Compressor
- Compress images while **keeping the original format**
- 🎯 **Target max size** slider (0.1MB – 5MB)
- 📊 **File size comparison** — see how much was saved per image
- 📦 Batch compress up to **20 files** at once — downloaded as a `.zip`
- ⚡ **Parallel compression** — all files compress simultaneously

### 📐 Resizer
- Resize images by **exact pixel dimensions** or **percentage**
- 🔒 **Lock aspect ratio** to avoid distortion
- 📦 Batch resize up to **20 files** at once — downloaded as a `.zip`
- 🎛️ **Same size for all** or **individual settings per image**

### ✂️ Cropper
- Crop images with a **draggable crop box**
- 📐 **Preset ratios** — Free, 1:1, 4:3, 16:9, 3:4, 9:16
- 🖼️ **Live preview** of the cropped area
- ⚠️ One image at a time

### General
- 🖱️ **Drag & drop** or click to upload
- 🔒 **100% private** — your images never leave your device
- 🚫 **No login required**

---

## 🛡️ Privacy

This tool is entirely client-side. No data is sent to any server. No analytics on your images. No storage. All processing happens on your own device using the browser's built-in Canvas API and Web Workers.

---

## ⚠️ Known Limitations

- **AVIF** is supported on Chrome/Edge but may fail on Firefox or Safari — use WebP for broader compatibility
- Very large images (16,000×16,000px+) may fail silently due to browser canvas memory limits
- Compression target size is a best-effort — exact output size may vary slightly
- HEIC/HEIF (iPhone photos) are not currently supported as input
- Compression time varies by file size and device — large files on mobile may take longer
- Cropper works on one image at a time

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
git clone https://github.com/jmbstudio-dev/Image-Tools.git
cd Image-Tools
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

---

## 🧰 Tech Stack

| Tool | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite 7 | Build tool |
| Tailwind CSS v4 | Styling |
| Canvas API | Image conversion and resizing |
| browser-image-compression | Image compression via Web Workers |
| JSZip | Bundling output files into `.zip` |
| file-saver | Triggering browser download |

---

## 📁 Project Structure
```
src/
├── components/
│   ├── ConverterTab.tsx    ← format conversion logic
│   ├── CompressorTab.tsx   ← compression logic
│   ├── ResizerTab.tsx      ← resize logic
│   ├── CropperTab.tsx      ← crop logic
│   ├── DropZone.tsx        ← shared upload UI
│   └── PreviewGrid.tsx     ← shared preview + progress UI
├── utils/
│   └── formatBytes.ts      ← file size formatter
└── sections/
    └── Home.tsx            ← tabs layout, header, info notes
```

---

## 📄 License

MIT — feel free to use, modify, and distribute.

---

Made by (https://github.com/jmbstudio-dev)