import { useRef, useState } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";

const YOUTUBE_VIDEO_ID = "DSVNKPM68-E";

export function HeroScreenCarousel() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [muted, setMuted] = useState(true);
  const [activated, setActivated] = useState(false);

  const toggleSound = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const command = muted ? "unMute" : "mute";
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: command, args: [] }),
      "*"
    );
    setMuted(!muted);
  };

  return (
    <div className="relative mx-auto max-w-5xl animate-fade-up delay-500">
      {/* Glow behind monitor */}
      <div className="absolute -inset-8 bg-gradient-to-t from-primary/20 via-accent/10 to-transparent blur-3xl rounded-3xl opacity-60" />

      {/* Monitor frame */}
      <div className="relative rounded-2xl border-2 border-white/20">
        {/* Top bezel */}
        <div className="bg-secondary rounded-t-2xl px-6 py-3 flex items-center gap-2 relative z-10">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
        </div>

        {/* Screen area */}
        <div className="relative bg-secondary overflow-hidden aspect-[16/9] rounded-b-lg border-x-4 border-b-4 border-secondary">
          {activated ? (
            <>
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`}
                title="CloudMature Présentation"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="absolute inset-0 w-full h-full border-0"
              />

              {/* Sound toggle button */}
              <button
                onClick={toggleSound}
                aria-label={muted ? "Activer le son" : "Couper le son"}
                className="absolute bottom-4 right-4 z-10 bg-secondary/80 backdrop-blur-sm hover:bg-primary/90 text-primary-foreground p-2.5 rounded-full border border-primary/30 transition-all duration-300 hover:scale-110"
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setActivated(true)}
              aria-label="Lire la vidéo de présentation CloudMature"
              className="absolute inset-0 w-full h-full group cursor-pointer"
            >
              {/* Lightweight thumbnail facade — no YouTube JS loaded until clicked */}
              <img
                src={`https://i.ytimg.com/vi/${YOUTUBE_VIDEO_ID}/hqdefault.jpg`}
                alt="CloudMature Présentation"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-primary/90 text-primary-foreground rounded-full p-5 group-hover:scale-110 transition-transform shadow-lg">
                  <Play className="w-8 h-8 fill-current" />
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Monitor stand */}
        <div className="flex justify-center relative z-10">
          <div className="w-24 h-6 bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10 rounded-b-lg" />
        </div>
        <div className="flex justify-center relative z-10">
          <div className="w-40 h-2 bg-muted-foreground/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
