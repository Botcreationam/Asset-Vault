import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, FileText, ShieldCheck, EyeOff, ShieldAlert } from "lucide-react";

interface SecureViewerProps {
  resourceId: string;
  resourceName: string;
  mimeType?: string | null;
  userEmail?: string | null;
  userId?: string;
}

export function SecureViewer({
  resourceId,
  resourceName,
  mimeType,
  userEmail,
  userId,
}: SecureViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("This action is disabled for protected content");
  const [drmSupported, setDrmSupported] = useState(false);

  const triggerWarning = useCallback((msg?: string) => {
    setWarningMessage(msg || "This action is disabled for protected content");
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 2500);
  }, []);

  useEffect(() => {
    async function setupDrmOverlay() {
      try {
        const video = videoRef.current;
        if (!video) return;

        const config = [{
          initDataTypes: ["cenc"],
          videoCapabilities: [{
            contentType: 'video/mp4; codecs="avc1.42E01E"',
            robustness: "SW_SECURE_DECODE",
          }],
        }];

        const keySystemAccess = await navigator.requestMediaKeySystemAccess(
          "org.w3.clearkey",
          config
        );
        const mediaKeys = await keySystemAccess.createMediaKeys();
        await video.setMediaKeys(mediaKeys);
        setDrmSupported(true);
      } catch {
        setDrmSupported(false);
      }
    }
    setupDrmOverlay();
  }, []);

  useEffect(() => {
    const blocked = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        (ctrl && ["s", "p", "c", "a", "u"].includes(e.key.toLowerCase())) ||
        e.key === "F12" ||
        e.key === "PrintScreen" ||
        (ctrl && e.shiftKey && ["i", "j", "c", "s"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === "PrintScreen") {
          setIsHidden(true);
          triggerWarning("Screenshot blocked — content is protected");
          setTimeout(() => setIsHidden(false), 3000);
        } else {
          triggerWarning();
        }
      }
    };

    const blockCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const blockDrag = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener("keydown", blocked, true);
    document.addEventListener("copy", blockCopy, true);
    document.addEventListener("cut", blockCopy, true);
    document.addEventListener("paste", blockCopy, true);
    document.addEventListener("dragstart", blockDrag, true);
    document.addEventListener("drop", blockDrag, true);

    return () => {
      document.removeEventListener("keydown", blocked, true);
      document.removeEventListener("copy", blockCopy, true);
      document.removeEventListener("cut", blockCopy, true);
      document.removeEventListener("paste", blockCopy, true);
      document.removeEventListener("dragstart", blockDrag, true);
      document.removeEventListener("drop", blockDrag, true);
    };
  }, [triggerWarning]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsHidden(true);
      } else {
        setTimeout(() => setIsHidden(false), 500);
      }
    };

    const handleBlur = () => {
      setIsHidden(true);
    };

    const handleFocus = () => {
      setTimeout(() => setIsHidden(false), 500);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    let displayMediaCleanup: (() => void) | null = null;

    const detectScreenCapture = () => {
      if (!navigator.mediaDevices?.getDisplayMedia) return;

      const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getDisplayMedia = async function (...args: any[]) {
        setIsHidden(true);
        triggerWarning("Screen recording detected — content hidden");
        const result = await origGetDisplayMedia(...args);
        result.getTracks().forEach((track: MediaStreamTrack) => {
          track.addEventListener("ended", () => {
            setTimeout(() => setIsHidden(false), 1000);
          });
        });
        return result;
      };

      displayMediaCleanup = () => {
        navigator.mediaDevices.getDisplayMedia = origGetDisplayMedia;
      };
    };

    detectScreenCapture();
    return () => { displayMediaCleanup?.(); };
  }, [triggerWarning]);

  const blockContext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const streamUrl = `${BASE}/api/resources/${resourceId}/stream`;

  const watermarkLabel = userEmail ?? (userId ? `ID:${userId.slice(0, 8)}` : "AcadVault");

  return (
    <>
      <style>{`
        @media print {
          .secure-viewer-container,
          .secure-viewer-container * {
            display: none !important;
            visibility: hidden !important;
          }
          body::after {
            content: "Printing is disabled for protected content — AcadVault";
            display: block;
            text-align: center;
            padding: 100px 40px;
            font-size: 24px;
            color: #999;
          }
        }
        .secure-viewer-container {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          -webkit-print-color-adjust: exact !important;
        }
        .secure-viewer-container img,
        .secure-viewer-container iframe {
          pointer-events: auto;
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          user-drag: none !important;
        }
        .secure-viewer-drm-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 3;
          pointer-events: none;
          object-fit: cover;
        }
        .secure-viewer-drm-layer::-webkit-media-controls {
          display: none !important;
        }
        .secure-viewer-drm-layer::-webkit-media-controls-enclosure {
          display: none !important;
        }
      `}</style>

      <div
        ref={containerRef}
        className="secure-viewer-container relative w-full overflow-hidden"
        style={{ height: "80vh" }}
        onContextMenu={blockContext}
        onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
        onDragStart={(e) => e.preventDefault()}
        onSelectStart={(e: any) => e.preventDefault()}
      >
        {isHidden && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black transition-all duration-100">
            <ShieldAlert className="w-14 h-14 text-red-500 mb-3 animate-pulse" />
            <p className="text-base font-bold text-white">Content Protected</p>
            <p className="text-xs text-gray-400 mt-1">Screenshots and screen recording are not allowed</p>
            <p className="text-xs text-gray-500 mt-3">Return to this tab to continue reading</p>
          </div>
        )}

        {showWarning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-lg bg-red-600/95 text-white px-4 py-2.5 text-sm font-medium shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <ShieldAlert className="w-4 h-4" />
            {warningMessage}
          </div>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          style={{ userSelect: "none" }}
        >
          {Array.from({ length: 12 }).map((_, row) =>
            Array.from({ length: 6 }).map((_, col) => (
              <span
                key={`${row}-${col}`}
                className="absolute text-[11px] font-semibold whitespace-nowrap opacity-[0.07] dark:opacity-[0.12] text-foreground"
                style={{
                  top: `${row * 14}%`,
                  left: `${col * 22 - 6}%`,
                  transform: "rotate(-30deg)",
                  transformOrigin: "top left",
                }}
              >
                {watermarkLabel} · AcadVault
              </span>
            ))
          )}
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          style={{ userSelect: "none" }}
        >
          {Array.from({ length: 8 }).map((_, row) =>
            Array.from({ length: 4 }).map((_, col) => (
              <span
                key={`id-${row}-${col}`}
                className="absolute text-[9px] font-mono whitespace-nowrap opacity-[0.03] dark:opacity-[0.06] text-foreground"
                style={{
                  top: `${row * 16 + 7}%`,
                  left: `${col * 28 + 10}%`,
                  transform: "rotate(15deg)",
                  transformOrigin: "center",
                }}
              >
                {userId?.slice(0, 12) || "anon"}
              </span>
            ))
          )}
        </div>

        <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-background/80 border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
          <ShieldCheck className="w-3 h-3 text-primary" />
          Protected · AcadVault
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{
            background: "transparent",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            userSelect: "none",
          }}
        />

        {drmSupported && (
          <video
            ref={videoRef}
            className="secure-viewer-drm-layer"
            autoPlay
            muted
            loop
            playsInline
            tabIndex={-1}
            aria-hidden="true"
          >
            <source src="data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhtZGF0AAAA1m1vb3YAAABsbXZoZAAAAAAAAAAAAAAAAAAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjYwLjMuMTAw" type="video/mp4" />
          </video>
        )}

        <iframe
          key={streamUrl}
          src={`${streamUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
          title={resourceName}
          className="absolute inset-0 w-full h-full border-none bg-neutral-50 dark:bg-neutral-900"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          referrerPolicy="no-referrer"
          allow="encrypted-media"
        />
      </div>
    </>
  );
}

export function SecureViewerSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] bg-muted/20 gap-4 text-muted-foreground">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="font-medium text-sm">Loading secure viewer...</p>
    </div>
  );
}

export function SecureViewerError({ onDownload }: { onDownload?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center p-10 bg-muted/10">
      <FileText className="w-16 h-16 text-muted-foreground opacity-30 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Preview unavailable</h3>
      <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
        This file type can't be previewed in the browser. Download it to view on your device.
      </p>
      {onDownload && (
        <button
          onClick={onDownload}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow hover:opacity-90 transition-opacity"
        >
          Download to view
        </button>
      )}
    </div>
  );
}
