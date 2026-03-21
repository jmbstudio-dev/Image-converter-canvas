import { useState } from "react";
import { ConverterTab } from "../components/ConverterTab";
import { CompressorTab } from "../components/CompressorTab";
import { ResizerTab } from "../components/ResizerTab";
import { CropperTab } from "../components/CropperTab";

const tabs = [
  {
    id: "converter",
    label: "🔄 Converter",
    description: "Change image format — WebP, JPEG, PNG, BMP, AVIF",
    notes: [
      "🎚️ Adjust quality to control output file size",
      "⚠️ AVIF may fail on Firefox/Safari — use WebP for best compatibility",
      "⚠️ Images larger than 16,000×16,000px may fail due to browser canvas limits",
    ],
    component: <ConverterTab />,
  },
  {
    id: "compressor",
    label: "🗜️ Compressor",
    description: "Reduce file size while keeping the original format",
    notes: [
      "🎯 Set a target max size — result may vary slightly",
      "📁 Max 20 files per batch",
      "⚠️ Large files may take longer depending on your device",
    ],
    component: <CompressorTab />,
  },
  {
    id: "resizer",
    label: "📐 Resizer",
    description: "Resize images by exact dimensions or percentage",
    notes: [
      "📁 Max 20 files per batch",
      "🔒 Lock aspect ratio to avoid distortion",
      "⚠️ Enlarging images may reduce quality",
    ],
    component: <ResizerTab />,
  },
  {
    id: "cropper",
    label: "✂️ Cropper",
    description: "Crop images to a specific ratio or custom area",
    notes: [
      "🖼️ Drag the crop box to reposition",
      "📐 Choose a preset ratio or crop freely",
      "⚠️ One image at a time",
    ],
    component: <CropperTab />,
  },
];

export const Home = () => {
  const [activeTab, setActiveTab] = useState("converter");
  const current = tabs.find((t) => t.id === activeTab)!;

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      <div className="container max-w-3xl mx-auto px-8 pt-32 pb-20 relative">

        {/* PAGE HEADER */}
        <div className="text-center space-y-2 mb-10 animate-fade-in animate-delay-100">
          <h2 className="text-3xl font-bold text-primary uppercase">
            Image Tools
          </h2>
          <p className="text-muted-foreground text-sm">
            Convert, compress, resize, or crop your images instantly.
          </p>
          <p className="font-bold text-primary text-sm">NO LOG-IN NEEDED.</p>
          <p className="text-xs text-muted-foreground">
            🔒 <strong>100% private</strong> — your images never leave your
            device. Everything runs in your browser, no uploads, no server.
          </p>
        </div>

        {/* TABS */}
        <div className="flex glass rounded-xl p-1 mb-6 animate-fade-in animate-delay-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-xs rounded-lg transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* INFO CARD */}
        <div className="text-left space-y-1 text-xs text-muted-foreground border border-dashed rounded-lg p-3 mb-6 animate-fade-in">
          <p className="font-semibold text-primary text-sm">{current.label}</p>
          <p>{current.description}</p>
          {current.notes.map((note, i) => (
            <p key={i}>{note}</p>
          ))}
        </div>

        {/* TOOL CONTENT */}
        <div className="glass rounded-xl p-5 shadow-lg animate-fade-in">
          {current.component}
        </div>

        {/* FOOTER */}
        <div className="pt-12 flex justify-center">
          <p className="text-sm text-muted-foreground">
            Thank you for checking this out!
          </p>
        </div>

      </div>
    </section>
  );
};