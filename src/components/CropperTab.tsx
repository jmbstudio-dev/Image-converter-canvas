import { useState, useRef, useCallback } from "react";
import { saveAs } from "file-saver";

const RATIOS = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
  { label: "9:16", value: 9 / 16 },
];

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const CropperTab = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, w: 200, h: 200 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, bx: 0, by: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  const drawOverlay = useCallback((box: CropBox) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // clear crop area
    ctx.clearRect(box.x, box.y, box.w, box.h);
    ctx.drawImage(
      img,
      (box.x / canvas.width) * naturalSize.w,
      (box.y / canvas.height) * naturalSize.h,
      (box.w / canvas.width) * naturalSize.w,
      (box.h / canvas.height) * naturalSize.h,
      box.x,
      box.y,
      box.w,
      box.h,
    );

    // border
    ctx.strokeStyle = "var(--color-primary)";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.w, box.h);

    // grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(box.x + (box.w / 3) * i, box.y);
      ctx.lineTo(box.x + (box.w / 3) * i, box.y + box.h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(box.x, box.y + (box.h / 3) * i);
      ctx.lineTo(box.x + box.w, box.y + (box.h / 3) * i);
      ctx.stroke();
    }

    updatePreview(box);
  }, [naturalSize]);

  const updatePreview = (box: CropBox) => {
    const preview = previewRef.current;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!preview || !img || !canvas) return;
    const ctx = preview.getContext("2d");
    if (!ctx) return;

    const scaleX = naturalSize.w / canvas.width;
    const scaleY = naturalSize.h / canvas.height;

    preview.width = box.w * scaleX;
    preview.height = box.h * scaleY;

    ctx.drawImage(
      img,
      box.x * scaleX,
      box.y * scaleY,
      box.w * scaleX,
      box.h * scaleY,
      0,
      0,
      preview.width,
      preview.height,
    );
  };

  const loadImage = (f: File) => {
    setFile(f);
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      imgRef.current = img;
      const container = containerRef.current;
      if (!container) return;

      const maxW = container.clientWidth;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const dw = Math.round(img.naturalWidth * scale);
      const dh = Math.round(img.naturalHeight * scale);

      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setDisplaySize({ w: dw, h: dh });

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = dw;
      canvas.height = dh;

      const initialBox: CropBox = { x: dw * 0.1, y: dh * 0.1, w: dw * 0.8, h: dh * 0.8 };
      setCropBox(initialBox);

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, dw, dh);

      setTimeout(() => drawOverlay(initialBox), 50);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadImage(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) loadImage(f);
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPos(e);
    setDragging(true);
    setDragStart({ x, y, bx: cropBox.x, by: cropBox.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const { x, y } = getCanvasPos(e);
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    const canvas = canvasRef.current!;

    let newX = Math.max(0, Math.min(dragStart.bx + dx, canvas.width - cropBox.w));
    let newY = Math.max(0, Math.min(dragStart.by + dy, canvas.height - cropBox.h));

    const newBox = { ...cropBox, x: newX, y: newY };
    setCropBox(newBox);
    drawOverlay(newBox);
  };

  const handleMouseUp = () => setDragging(false);

  const applyRatio = (r: number | null) => {
    setRatio(r);
    const canvas = canvasRef.current;
    if (!canvas) return;

    let newBox = { ...cropBox };
    if (r !== null) {
      newBox.h = Math.round(newBox.w / r);
      if (newBox.y + newBox.h > canvas.height) {
        newBox.h = canvas.height - newBox.y;
        newBox.w = Math.round(newBox.h * r);
      }
    }
    setCropBox(newBox);
    drawOverlay(newBox);
  };

  const handleCrop = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !file) return;

    const scaleX = naturalSize.w / canvas.width;
    const scaleY = naturalSize.h / canvas.height;

    const out = document.createElement("canvas");
    out.width = Math.round(cropBox.w * scaleX);
    out.height = Math.round(cropBox.h * scaleY);
    const ctx = out.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      img,
      cropBox.x * scaleX,
      cropBox.y * scaleY,
      out.width,
      out.height,
      0,
      0,
      out.width,
      out.height,
    );

    out.toBlob((blob) => {
      if (!blob) return;
      const ext = file.name.split(".").pop();
      saveAs(blob, file.name.replace(/\.[^/.]+$/, "") + `_cropped.${ext}`);
    }, file.type);
  };

  return (
    <div className="space-y-6">

      {/* DROP ZONE */}
      {!file && (
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFiles}
            className="hidden"
          />
          <p className="text-sm text-muted-foreground">
            Drag & drop an image here or click to upload
          </p>
        </div>
      )}

      {/* CHANGE IMAGE BUTTON */}
      {file && (
        <button
          onClick={() => {
            setFile(null);
            setCropBox({ x: 0, y: 0, w: 200, h: 200 });
          }}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          ← Change image
        </button>
      )}

      {/* RATIO SELECTOR */}
      {file && (
        <div className="flex flex-wrap gap-2">
          {RATIOS.map((r) => (
            <button
              key={r.label}
              onClick={() => applyRatio(r.value)}
              className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                ratio === r.value
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* CANVAS */}
      <div ref={containerRef} className="w-full">
        {file && (
          <canvas
            ref={canvasRef}
            width={displaySize.w}
            height={displaySize.h}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full rounded-lg cursor-move"
          />
        )}
      </div>

      {/* PREVIEW */}
      {file && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Preview
          </p>
          <canvas
            ref={previewRef}
            className="max-w-full rounded-lg border border-border/50 max-h-40 object-contain"
          />
          <p className="text-xs text-muted-foreground">
            Crop size: {Math.round(cropBox.w)} × {Math.round(cropBox.h)}px
          </p>
        </div>
      )}

      {/* CROP BUTTON */}
      <button
        onClick={handleCrop}
        disabled={!file}
        className="w-full py-2 rounded-md bg-primary text-background hover:opacity-90 disabled:opacity-50 transition"
      >
        Crop & Download
      </button>

    </div>
  );
};