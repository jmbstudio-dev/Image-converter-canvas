import { useState, useRef } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import imageCompression from "browser-image-compression";
import { DropZone } from "./DropZone";
import { PreviewGrid } from "./PreviewGrid";

const getExtension = (file: File): string =>
  file.name.split(".").pop()?.toLowerCase() ?? "img";

export const CompressorTab = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [maxSizeMB, setMaxSizeMB] = useState(1);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [outputSizes, setOutputSizes] = useState<number[]>([]);

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

  const compress = async () => {
    setCompressing(true);
    reset(files.length);

    const zip = new JSZip();

    await Promise.all(
      files.map(async (file, i) => {
        try {
          const compressed = await imageCompression(file, {
            maxSizeMB,
            useWebWorker: true,
            onProgress: (p) => {
              setProgress((prev) => {
                const copy = [...prev]; copy[i] = p; return copy;
              });
            },
          });

          setOutputSizes((prev) => {
            const copy = [...prev]; copy[i] = compressed.size; return copy;
          });

          const ext = getExtension(file);
          const newName =
            file.name.replace(/\.[^/.]+$/, "") + `-compressed.${ext}`;
          zip.file(newName, await compressed.arrayBuffer());

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
    saveAs(zipBlob, "compressed-images.zip");
    setCompressing(false);
  };

  return (
    <div className="space-y-6">
      <DropZone inputRef={inputRef} onFiles={handleFiles} onDrop={handleDrop} />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted-foreground">Target max size:</label>
          <span className="text-sm text-primary font-medium">{maxSizeMB} MB</span>
        </div>
        <input
          type="range"
          min={0.1} max={5} step={0.1}
          value={maxSizeMB}
          onChange={(e) => setMaxSizeMB(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.1 MB</span>
          <span>5 MB</span>
        </div>
      </div>

      <button
        onClick={compress}
        disabled={files.length === 0 || compressing}
        className="w-full py-2 rounded-md bg-primary text-background mt-auto hover:opacity-90 disabled:opacity-50 transition"
      >
        {compressing ? "Compressing..." : "Compress Images"}
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