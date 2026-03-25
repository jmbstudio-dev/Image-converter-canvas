import { useState, useRef } from "react";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { Download } from "lucide-react";
import imageCompression from "browser-image-compression";
import { formatBytes } from "../utils/formatBytes";

export const CompressorTab = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [targetMB, setTargetMB] = useState(1);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [outputSizes, setOutputSizes] = useState<number[]>([]);
  const [outputBlobs, setOutputBlobs] = useState<(Blob | null)[]>([]);
  const [zipMode, setZipMode] = useState(false);

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

  const compressImages = async () => {
    setCompressing(true);
    setProgress(Array(files.length).fill(0));
    setErrors(Array(files.length).fill(""));
    setOutputSizes(Array(files.length).fill(0));

    const blobs: (Blob | null)[] = Array(files.length).fill(null);
    const zip = new JSZip();

    await Promise.all(
      files.map(async (file, i) => {
        try {
          setProgress((prev) => { const c = [...prev]; c[i] = 10; return c; });

          const compressed = await imageCompression(file, {
            maxSizeMB: targetMB,
            useWebWorker: true,
            onProgress: (p) => {
              setProgress((prev) => { const c = [...prev]; c[i] = Math.round(p * 0.8); return c; });
            },
          });

          blobs[i] = compressed;

          setOutputSizes((prev) => { const c = [...prev]; c[i] = compressed.size; return c; });
          setProgress((prev) => { const c = [...prev]; c[i] = 90; return c; });

          const newName = file.name.replace(/\.[^/.]+$/, "") + "_compressed." + file.name.split(".").pop();

          if (zipMode) {
            zip.file(newName, await compressed.arrayBuffer());
          } else {
            saveAs(compressed, newName);
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
      saveAs(zipBlob, "compressed-images.zip");
    }

    setCompressing(false);
  };

  const downloadSingle = (idx: number) => {
    const blob = outputBlobs[idx];
    if (!blob) return;
    const newName = files[idx].name.replace(/\.[^/.]+$/, "") + "_compressed." + files[idx].name.split(".").pop();
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

      {/* TARGET SIZE */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted-foreground">Target max size:</label>
          <span className="text-sm text-primary font-medium">{targetMB} MB</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.1}
          value={targetMB}
          onChange={(e) => setTargetMB(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.1 MB</span>
          <span>5 MB</span>
        </div>
      </div>

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
        onClick={compressImages}
        disabled={files.length === 0 || compressing}
        className="w-full py-2 rounded-md bg-primary text-background hover:opacity-90 disabled:opacity-50 transition"
      >
        {compressing ? "Compressing..." : "Compress Images"}
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