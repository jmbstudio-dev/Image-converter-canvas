import { useState, useRef } from "react";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { PreviewGrid } from "./PreviewGrid";

const FORMATS = [
  { label: "WebP", value: "image/webp", ext: "webp", hasQuality: true },
  { label: "JPEG", value: "image/jpeg", ext: "jpg", hasQuality: true },
  { label: "PNG", value: "image/png", ext: "png", hasQuality: false },
  { label: "BMP", value: "image/bmp", ext: "bmp", hasQuality: false },
  { label: "AVIF", value: "image/avif", ext: "avif", hasQuality: true },
  { label: "HTML", value: "text/html", ext: "html", hasQuality: false },
];

const RASTER_FORMATS = ["image/webp", "image/jpeg", "image/png", "image/bmp", "image/avif"];

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

/**
 * Parse SVG intrinsic dimensions from width/height attrs or viewBox.
 * Falls back to `fallback` x `fallback` if nothing is found.
 */
const parseSvgDimensions = (svgText: string, fallback: number): { w: number; h: number } => {
  const vb = svgText.match(/viewBox=["']\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  const wAttr = svgText.match(/<svg[^>]*\bwidth=["']([\d.]+)/i);
  const hAttr = svgText.match(/<svg[^>]*\bheight=["']([\d.]+)/i);
  if (wAttr && hAttr) return { w: parseFloat(wAttr[1]), h: parseFloat(hAttr[1]) };
  if (vb) return { w: parseFloat(vb[3]), h: parseFloat(vb[4]) };
  return { w: fallback, h: fallback };
};

/**
 * Strip existing width/height from the root <svg> tag and inject new ones.
 * This ensures the browser gives the image correct intrinsic dimensions
 * when drawn onto a canvas element.
 */
const injectSvgSize = (svgText: string, w: number, h: number): string =>
  svgText.replace(/(<svg\b[^>]*?)>/i, (_match, before) => {
    const cleaned = before.replace(/\s*(width|height)=["'][^"']*["']/gi, "");
    return `${cleaned} width="${w}" height="${h}">`;
  });

/**
 * Convert an SVG file to a raster Blob via an offscreen canvas.
 *
 * Root cause of the original hang: blob URLs for SVGs with no intrinsic
 * dimensions give img.naturalWidth === 0, so the canvas is 0×0 and
 * toBlob() either returns null immediately or never fires the callback.
 *
 * Fix:
 *  1. Read SVG as text.
 *  2. Parse true dimensions from viewBox / width+height attrs.
 *  3. Scale so the longest side equals `targetSize`.
 *  4. Inject explicit width + height into the <svg> tag.
 *  5. Encode as a base64 data URL — avoids all blob-URL/CORS quirks.
 *  6. Draw onto a correctly-sized canvas and export.
 */
const svgToRasterBlob = (
  file: File,
  format: string,
  quality: number,
  targetSize: number,
): Promise<Blob> =>
  new Promise(async (resolve, reject) => {
    try {
      const svgText = await file.text();
      const natural = parseSvgDimensions(svgText, targetSize);

      // Scale proportionally so the longest side === targetSize
      const scale = targetSize / Math.max(natural.w, natural.h);
      const w = Math.round(natural.w * scale);
      const h = Math.round(natural.h * scale);

      const sized = injectSvgSize(svgText, w, h);

      // base64 data URL is the most reliable way to load SVG onto canvas
      const dataUrl =
        "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(sized)));

      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context unavailable"));

        // Opaque white background for formats without alpha
        if (format === "image/jpeg" || format === "image/bmp") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
        }

        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
          format,
          quality / 100,
        );
      };

      img.onerror = () => reject(new Error("SVG failed to render — check for unsupported features"));
      img.src = dataUrl;
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });

/**
 * Standard canvas conversion for regular raster image files (JPG, PNG, etc.).
 */
const convertWithCanvas = (file: File, format: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));
      if (format === "image/jpeg" || format === "image/bmp") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Conversion failed"))),
        format,
        quality / 100,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load ${file.name}`)); };
    img.src = url;
  });

/**
 * Embed an SVG file inline inside a self-contained HTML page.
 */
const convertSvgToHtml = async (file: File): Promise<Blob> => {
  const svgText = await file.text();
  const title = file.name.replace(/\.svg$/i, "");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: #ffffff;
    }
    .wrapper {
      max-width: 100%; max-height: 100%;
      padding: 2rem;
      display: flex; align-items: center; justify-content: center;
    }
    .wrapper svg { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="wrapper">
    ${svgText}
  </div>
</body>
</html>`;
  return new Blob([html], { type: "text/html" });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ConverterTab = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState("image/webp");
  const [quality, setQuality] = useState(85);
  const [svgSize, setSvgSize] = useState(1024);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [outputSizes, setOutputSizes] = useState<number[]>([]);
  const [outputBlobs, setOutputBlobs] = useState<(Blob | null)[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [zipMode, setZipMode] = useState(false);

  const selectedFormat = FORMATS.find((f) => f.value === format)!;
  const hasSvgFiles = files.some(
    (f) => f.type === "image/svg+xml" || f.name.toLowerCase().endsWith(".svg"),
  );
  const isHtmlOutput = format === "text/html";
  const isRasterOutput = RASTER_FORMATS.includes(format);

  const initFiles = (arr: File[]) => {
    setFiles(arr);
    setProgress(Array(arr.length).fill(0));
    setErrors(Array(arr.length).fill(""));
    setOutputSizes(Array(arr.length).fill(0));
    setOutputBlobs(Array(arr.length).fill(null));
    setSelected(Array(arr.length).fill(false));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    initFiles(Array.from(e.target.files).slice(0, 20));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    initFiles(
      Array.from(e.dataTransfer.files)
        .filter((f) => f.type.startsWith("image/") || f.name.toLowerCase().endsWith(".svg"))
        .slice(0, 20),
    );
  };

  const convertImages = async () => {
    setConverting(true);
    setProgress(Array(files.length).fill(0));
    setErrors(Array(files.length).fill(""));
    setOutputSizes(Array(files.length).fill(0));
    setSelected(Array(files.length).fill(false));

    const blobs: (Blob | null)[] = Array(files.length).fill(null);
    const zip = new JSZip();

    await Promise.all(
      files.map(async (file, i) => {
        const isSvg =
          file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
        try {
          setProgress((prev) => { const c = [...prev]; c[i] = 10; return c; });

          let blob: Blob;

          if (isHtmlOutput) {
            if (!isSvg) throw new Error("HTML output requires an SVG source file");
            blob = await convertSvgToHtml(file);
          } else if (isRasterOutput) {
            blob = isSvg
              ? await svgToRasterBlob(file, format, quality, svgSize)
              : await convertWithCanvas(file, format, quality);
          } else {
            throw new Error("Unsupported output format");
          }

          blobs[i] = blob;
          setOutputSizes((prev) => { const c = [...prev]; c[i] = blob.size; return c; });
          setProgress((prev) => { const c = [...prev]; c[i] = 90; return c; });

          const newName = file.name.replace(/\.[^/.]+$/, "") + "." + selectedFormat.ext;
          if (zipMode) zip.file(newName, await blob.arrayBuffer());
          else saveAs(blob, newName);

          setProgress((prev) => { const c = [...prev]; c[i] = 100; return c; });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed";
          setErrors((prev) => { const c = [...prev]; c[i] = msg; return c; });
          setProgress((prev) => { const c = [...prev]; c[i] = 0; return c; });
        }
      }),
    );

    setOutputBlobs(blobs);
    if (zipMode) {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "converted-images.zip");
    }
    setConverting(false);
  };

  const downloadSingle = (idx: number) => {
    const blob = outputBlobs[idx];
    if (!blob) return;
    saveAs(blob, files[idx].name.replace(/\.[^/.]+$/, "") + "." + selectedFormat.ext);
  };

  const handleToggle = (idx: number) =>
    setSelected((prev) => { const c = [...prev]; c[idx] = !c[idx]; return c; });

  const handleSelectAll = () => {
    const allSelected = selected.every(Boolean);
    setSelected(outputBlobs.map((b) => (!allSelected && !!b)));
  };

  const handleDownloadSelected = async () => {
    const zip = new JSZip();
    files.forEach((file, i) => {
      if (selected[i] && outputBlobs[i]) {
        zip.file(file.name.replace(/\.[^/.]+$/, "") + "." + selectedFormat.ext, outputBlobs[i]!);
      }
    });
    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, "selected-converted.zip");
  };

  return (
    <div className="space-y-6">

      {/* DROP ZONE */}
      <div
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.svg"
          onChange={handleFiles}
          className="hidden"
        />
        <p className="text-sm text-muted-foreground">
          Drag & drop images here or click to upload
        </p>
        <p className="text-xs text-muted-foreground mt-1 opacity-60">
          Supports JPG, PNG, WebP, BMP, AVIF,{" "}
          <span className="text-primary">SVG</span>
        </p>
      </div>

      {/* FORMAT SELECTOR */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-muted-foreground">Convert to:</label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="bg-primary border rounded-md px-3 py-1 text-sm text-background"
        >
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* HTML OUTPUT NOTE */}
      {isHtmlOutput && (
        <div className="text-xs text-muted-foreground border border-dashed border-primary/30 rounded-lg p-3 space-y-1">
          <p className="text-primary font-semibold">SVG → HTML mode</p>
          <p>
            Embeds your SVG inline inside a clean, self-contained HTML file.
            Only SVG source files are supported for this output.
          </p>
        </div>
      )}

      {/* SVG RENDER SIZE — only when SVG files are loaded + raster output */}
      {hasSvgFiles && isRasterOutput && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">
              SVG render size (longest side):
            </label>
            <span className="text-sm text-primary font-medium">{svgSize}px</span>
          </div>
          <input
            type="range"
            min={128}
            max={4096}
            step={128}
            value={svgSize}
            onChange={(e) => setSvgSize(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>128px</span>
            <span>4096px</span>
          </div>
        </div>
      )}

      {/* QUALITY */}
      {selectedFormat.hasQuality && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">Quality:</label>
            <span className="text-sm text-primary font-medium">{quality}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Smaller file</span>
            <span>Best quality</span>
          </div>
        </div>
      )}

      {/* ZIP TOGGLE */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={zipMode}
          onChange={(e) => setZipMode(e.target.checked)}
          className="accent-primary w-4 h-4"
        />
        <span className="text-sm text-muted-foreground">
          Download as <span className="text-foreground">.zip</span>
        </span>
      </label>

      {/* ACTION BUTTON */}
      <button
        onClick={convertImages}
        disabled={files.length === 0 || converting}
        className="w-full py-2 rounded-md bg-primary text-background hover:opacity-90 disabled:opacity-50 transition"
      >
        {converting ? "Converting..." : "Convert Images"}
      </button>

      <p className="text-sm text-center text-muted-foreground">
        {files.length} file(s) selected
      </p>

      {/* Raster output — full preview grid */}
      {!isHtmlOutput && (
        <PreviewGrid
          files={files}
          progress={progress}
          errors={errors}
          outputSizes={outputSizes}
          outputBlobs={outputBlobs}
          selected={selected}
          onToggle={handleToggle}
          onSelectAll={handleSelectAll}
          onDownload={downloadSingle}
          onDownloadSelected={handleDownloadSelected}
        />
      )}

      {/* HTML output — simple progress list (blobs aren't renderable images) */}
      {isHtmlOutput && files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs text-muted-foreground truncate">{file.name}</p>
              <div className="w-full bg-surface rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    errors[i]
                      ? "bg-red-500"
                      : progress[i] === 100
                        ? "bg-green-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${errors[i] ? 100 : (progress[i] ?? 0)}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {errors[i] ? (
                  <span className="text-red-500">{errors[i]}</span>
                ) : progress[i] === 100 ? (
                  <span className="text-green-500">
                    ✓ {file.name.replace(/\.[^/.]+$/, "")}.html saved
                  </span>
                ) : (
                  `${progress[i] ?? 0}%`
                )}
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};