import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, FileText, ShieldCheck, EyeOff } from "lucide-react";

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
  const [isHidden, setIsHidden] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

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
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 2000);
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
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsHidden(true);
      } else {
        setTimeout(() => setIsHidden(false), 300);
      }
    };

    const handleBlur = () => {
      setIsHidden(true);
    };

    const handleFocus = () => {
      setTimeout(() => setIsHidden(false), 300);
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
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl transition-all duration-200">
            <EyeOff className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm font-semibold text-muted-foreground">Content hidden for protection</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Return to this tab to continue reading</p>
          </div>
        )}

        {showWarning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-destructive/90 text-destructive-foreground px-4 py-2 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <ShieldCheck className="w-4 h-4" />
            This action is disabled for protected content
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
