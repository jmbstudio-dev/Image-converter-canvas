import { useState, useRef } from "react";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { Download } from "lucide-react";
// import { PreviewGrid } from "./PreviewGrid";
import { formatBytes } from "../utils/formatBytes";

const FORMATS = [
  { label: "WebP", value: "image/webp", ext: "webp", hasQuality: true },
  { label: "JPEG", value: "image/jpeg", ext: "jpg", hasQuality: true },
  { label: "PNG", value: "image/png", ext: "png", hasQuality: false },
  { label: "BMP", value: "image/bmp", ext: "bmp", hasQuality: false },
  { label: "AVIF", value: "image/avif", ext: "avif", hasQuality: true },
];

const convertWithCanvas = (
  file: File,
  format: string,
  quality: number,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
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
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load ${file.name}`));
    };
    img.src = url;
  });
};

export const ConverterTab = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState("image/webp");
  const [quality, setQuality] = useState(85);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [outputSizes, setOutputSizes] = useState<number[]>([]);
  const [outputBlobs, setOutputBlobs] = useState<(Blob | null)[]>([]);
  const [zipMode, setZipMode] = useState(false);

  const selectedFormat = FORMATS.find((f) => f.value === format)!;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).slice(0, 20);
    setFiles(selected);
    setProgress(Array(selected.length).fill(0));
    setErrors(Array(selected.length).fill(""));
    setOutputSizes(Array(selected.length).fill(0));
    setOutputBlobs(Array(selected.length).fill(null));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 20);
    setFiles(dropped);
    setProgress(Array(dropped.length).fill(0));
    setErrors(Array(dropped.length).fill(""));
    setOutputSizes(Array(dropped.length).fill(0));
    setOutputBlobs(Array(dropped.length).fill(null));
  };

  const convertImages = async () => {
    setConverting(true);
    setProgress(Array(files.length).fill(0));
    setErrors(Array(files.length).fill(""));
    setOutputSizes(Array(files.length).fill(0));

    const blobs: (Blob | null)[] = Array(files.length).fill(null);
    const zip = new JSZip();

    await Promise.all(
      files.map(async (file, i) => {
        try {
          setProgress((prev) => { const c = [...prev]; c[i] = 10; return c; });
          const blob = await convertWithCanvas(file, format, quality);
          blobs[i] = blob;

          setOutputSizes((prev) => { const c = [...prev]; c[i] = blob.size; return c; });
          setProgress((prev) => { const c = [...prev]; c[i] = 90; return c; });

          const newName = file.name.replace(/\.[^/.]+$/, "") + "." + selectedFormat.ext;

          if (zipMode) {
            zip.file(newName, await blob.arrayBuffer());
          } else {
            saveAs(blob, newName);
          }

          setProgress((prev) => { const c = [...prev]; c[i] = 100; return c; });
        } catch {
          setErrors((prev) => { const c = [...prev]; c[i] = "Failed"; return c; });
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
    const newName = files[idx].name.replace(/\.[^/.]+$/, "") + "." + selectedFormat.ext;
    saveAs(blob, newName);
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
          accept="image/*"
          onChange={handleFiles}
          className="hidden"
        />
        <p className="text-sm text-muted-foreground">
          Drag & drop images here or click to upload
        </p>
      </div>

      {/* FORMAT */}
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

      {/* BUTTON */}
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

      {/* PREVIEW GRID WITH SAVE BUTTONS */}
      <div className="grid grid-cols-3 gap-2">
        {files.map((file, i) => (
          <div key={i} className="space-y-1">
            <div className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt="preview"
                className="w-full h-20 object-cover rounded-md"
              />
              {progress[i] === 100 && outputBlobs[i] && (
                <button
                  onClick={() => downloadSingle(i)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
            <div className="w-full bg-surface rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  errors[i] ? "bg-red-500" : progress[i] === 100 ? "bg-green-500" : "bg-primary"
                }`}
                style={{ width: `${errors[i] ? 100 : progress[i] ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {errors[i] ? (
                <span className="text-red-500">Failed</span>
              ) : progress[i] === 100 && outputSizes[i] ? (
                <span className="text-green-500">
                  {formatBytes(file.size)} → {formatBytes(outputSizes[i])}
                </span>
              ) : (
                `${progress[i] ?? 0}%`
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};