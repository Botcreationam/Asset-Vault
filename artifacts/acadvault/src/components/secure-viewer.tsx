import { useEffect, useRef } from "react";
import { Loader2, FileText, ShieldCheck } from "lucide-react";

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

  // ── Block dangerous keyboard shortcuts globally while viewing ──────────────
  useEffect(() => {
    const blocked = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        ctrl && ["s", "p", "c", "a", "u"].includes(e.key.toLowerCase()) ||
        e.key === "F12" ||
        ctrl && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase()) ||
        ctrl && e.key.toLowerCase() === "shift"
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", blocked, true);
    return () => document.removeEventListener("keydown", blocked, true);
  }, []);

  // ── Block right-click on the container ────────────────────────────────────
  const blockContext = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Stream URL — authenticated via session cookie, never a raw GCS URL
  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const streamUrl = `${BASE}/api/resources/${resourceId}/stream`;

  // Watermark label
  const watermarkLabel = userEmail ?? (userId ? `ID:${userId.slice(0, 8)}` : "AcadVault");

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden"
      style={{ height: "80vh" }}
      onContextMenu={blockContext}
      // Prevent text drag-selection from starting
      onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
    >
      {/* ── Watermark overlay ─────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        style={{ userSelect: "none" }}
      >
        {/* Diagonal repeated text watermark */}
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

      {/* ── Shield badge ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-background/80 border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
        <ShieldCheck className="w-3 h-3 text-primary" />
        Protected · AcadVault
      </div>

      {/* ── The iframe loaded from secure proxy ───────────────────────── */}
      <iframe
        key={streamUrl}
        src={`${streamUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
        title={resourceName}
        className="absolute inset-0 w-full h-full border-none bg-neutral-50 dark:bg-neutral-900"
        // no allow-downloads → browser will not offer save-file dialog
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export function SecureViewerSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] bg-muted/20 gap-4 text-muted-foreground">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="font-medium text-sm">Loading secure viewer…</p>
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
