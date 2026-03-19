import { formatBytes } from "../utils/formatBytes";

export const PreviewGrid = ({
  files,
  progress,
  errors,
  outputSizes,
}: {
  files: File[];
  progress: number[];
  errors: string[];
  outputSizes: number[];
}) => (
  <div className="grid grid-cols-3 gap-2">
    {files.map((file, i) => (
      <div key={i} className="space-y-1">
        <img
          src={URL.createObjectURL(file)}
          alt="preview"
          className="w-full h-20 object-cover rounded-md"
        />
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              errors[i]
                ? "bg-red-500"
                : progress[i] === 100
                  ? "bg-green-500"
                  : progress[i] > 0
                    ? "bg-primary animate-pulse"
                    : "bg-primary"
            }`}
            style={{ width: `${errors[i] ? 100 : (progress[i] ?? 0)}%` }}
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
);