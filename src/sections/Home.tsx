import { ConverterTab } from "../components/ConverterTab";
import { CompressorTab } from "../components/CompressorTab";

export const Home = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      <div className="container max-w-6xl mx-auto px-8 pt-32 pb-20 relative">

        {/* Page header */}
        <div className="text-center space-y-2 mb-10 animate-fade-in animate-delay-100">
          <h2 className="text-3xl font-bold text-primary uppercase">
            Image Tools
          </h2>
          <p className="text-muted-foreground text-sm">
            Convert or compress your images instantly. No login needed. 👍
          </p>
          <p className="font-bold text-primary text-sm">NO LOG-IN NEEDED.</p>
          <p className="text-xs text-muted-foreground">
            🔒 <strong>100% private</strong> — your images never leave your device. Everything runs in your browser, no uploads, no server.
          </p>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in animate-delay-200">

          {/* Left — Converter */}
          <div className="space-y-4">
            <div className="text-left space-y-1 text-xs text-muted-foreground border border-dashed rounded-lg p-3">
              <p className="font-semibold text-primary text-sm">🔄 Converter</p>
              <p>Change image format — WebP, JPEG, PNG, BMP, AVIF</p>
              <p>🎚️ Adjust quality to control output file size</p>
              <p>⚠️ <strong>AVIF</strong> may fail on Firefox/Safari — use WebP for best compatibility</p>
              <p>⚠️ Images larger than 16,000×16,000px may fail due to browser canvas limits</p>
            </div>
            <div className="glass rounded-xl p-5 shadow-lg">
              <ConverterTab />
            </div>
          </div>

          {/* Right — Compressor */}
          <div className="space-y-4">
            <div className="text-left space-y-1 text-xs text-muted-foreground border border-dashed rounded-lg p-3">
              <p className="font-semibold text-primary text-sm">🗜️ Compressor</p>
              <p>Reduce file size while keeping the original format</p>
              <p>🎯 Set a target max size — result may vary slightly</p>
              <p>📁 Max 20 files per batch</p>
              <p>⚠️ Large files may take longer depending on your device</p>
            </div>
            <div className="glass rounded-xl p-5 shadow-lg">
              <CompressorTab />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-12 flex justify-center">
          <p className="text-sm text-muted-foreground">
            Thank you for checking this out!
          </p>
        </div>

      </div>
    </section>
  );
};
