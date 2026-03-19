import React from "react";

export const DropZone = ({
  inputRef,
  onFiles,
  onDrop,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}) => (
  <div
    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition"
    onDrop={onDrop}
    onDragOver={(e) => e.preventDefault()}
    onClick={() => inputRef.current?.click()}
  >
    <input
      ref={inputRef}
      type="file"
      multiple
      accept="image/*"
      onChange={onFiles}
      className="hidden"
    />
    <p className="text-sm text-muted-foreground">
      Drag & drop images here or click to upload
    </p>
  </div>
);