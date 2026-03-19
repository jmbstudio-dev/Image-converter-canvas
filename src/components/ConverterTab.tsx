import { useState, useRef } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { DropZone } from "./DropZone";
import { PreviewGrid } from "./PreviewGrid";

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
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Conversion failed"));
        },
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

  const selectedFormat = FORMATS.find((f) => f.value === format)!;

  const reset = (len: number) => {
    setProgress(Array(len).fill(0));
    setErrors(Array(len).fill(""));
    setOutputSizes(Array(len).fill(0));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).slice(0, 20);
    setFiles(selected);
    reset(selected.length);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 20);
    setFiles(dropped);
    reset(dropped.length);
  };

  const convert = async () => {
    setConverting(true);
    reset(files.length);

    const zip = new JSZip();

    await Promise.all(
      files.map(async (file, i) => {
        try {
          setProgress((prev) => {
            const copy = [...prev]; copy[i] = 10; return copy;
          });

          const blob = await convertWithCanvas(file, format, quality);

          setOutputSizes((prev) => {
            const copy = [...prev]; copy[i] = blob.size; return copy;
          });
          setProgress((prev) => {
            const copy = [...prev]; copy[i] = 90; return copy;
          });

          const newName =
            file.name.replace(/\.[^/.]+$/, "") + "." + selectedFormat.ext;
          zip.file(newName, await blob.arrayBuffer());

          setProgress((prev) => {
            const copy = [...prev]; copy[i] = 100; return copy;
          });
        } catch {
          setErrors((prev) => {
            const copy = [...prev]; copy[i] = "Failed"; return copy;
          });
          setProgress((prev) => {
            const copy = [...prev]; copy[i] = 0; return copy;
          });
        }
      }),
    );

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, "converted-images.zip");
    setConverting(false);
  };

  return (
    <div className="space-y-6">
      <DropZone inputRef={inputRef} onFiles={handleFiles} onDrop={handleDrop} />

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

      {selectedFormat.hasQuality && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">Quality:</label>
            <span className="text-sm text-primary font-medium">{quality}%</span>
          </div>
          <input
            type="range"
            min={10} max={100} step={5}
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

      <button
        onClick={convert}
        disabled={files.length === 0 || converting}
        className="w-full py-2 rounded-md bg-primary text-background hover:opacity-90 disabled:opacity-50 transition"
      >
        {converting ? "Converting..." : "Convert Images"}
      </button>

      <p className="text-sm text-center text-muted-foreground">
        {files.length} file(s) selected
      </p>

      <PreviewGrid
        files={files}
        progress={progress}
        errors={errors}
        outputSizes={outputSizes}
      />
    </div>
  );
};