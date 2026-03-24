import { useRoute, Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetResource,
  useViewResource,
  useDownloadResource,
  useGetFolderPath,
} from "@workspace/api-client-react";
import { AuthWrapper } from "@/components/auth-wrapper";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  Download,
  Eye,
  Clock,
  HardDrive,
  Zap,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Folder,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const TYPE_COLORS: Record<string, string> = {
  pdf: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900",
  slides: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900",
  book: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900",
  notes: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-900",
  video: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900",
};

function formatBytes(bytes?: number) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ResourceDetail() {
  const [, params] = useRoute("/resource/:resourceId");
  const resourceId = params?.resourceId || "";
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: resource, isLoading: isLoadingResource } = useGetResource(resourceId, {
    query: { enabled: !!resourceId },
  });

  const { data: viewData, isLoading: isLoadingView, isError: isViewError } = useViewResource(
    resourceId,
    { query: { enabled: !!resourceId, retry: false } }
  );

  const { data: pathData } = useGetFolderPath(resource?.folderId || "", {
    query: { enabled: !!resource?.folderId },
  });

  const downloadMutation = useDownloadResource({
    mutation: {
      onSuccess: async (data) => {
        setIsDownloadModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/units/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

        // Force immediate download via blob
        setIsDownloading(true);
        try {
          const response = await fetch(data.url);
          if (!response.ok) throw new Error("Failed to fetch file");
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = blobUrl;
          anchor.download = resource?.name || "download";
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);

          toast({
            title: "Download started",
            description: `${data.unitsSpent} units used · ${data.newBalance} remaining`,
          });
        } catch {
          // Fallback: open in new tab if fetch fails
          window.open(data.url, "_blank");
          toast({ title: "Download ready", description: "File opened in a new tab." });
        } finally {
          setIsDownloading(false);
        }
      },
      onError: (error: any) => {
        setIsDownloadModalOpen(false);
        toast({
          title: "Download failed",
          description: error?.response?.data?.error || error.message || "Something went wrong.",
          variant: "destructive",
        });
      },
    },
  });

  const handleDownloadClick = () => {
    if (!resource) return;
    if ((user?.unitsBalance || 0) < resource.downloadCost) {
      toast({
        title: "Not enough units",
        description: `You need ${resource.downloadCost} units but have ${user?.unitsBalance}. Top up in your Account.`,
        variant: "destructive",
      });
      return;
    }
    setIsDownloadModalOpen(true);
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoadingResource) {
    return (
      <AuthWrapper>
        <div className="flex flex-col gap-4 max-w-6xl mx-auto">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-[70vh] w-full rounded-2xl" />
        </div>
      </AuthWrapper>
    );
  }

  if (!resource) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4 opacity-40" />
        <h2 className="text-xl font-semibold mb-2">Resource not found</h2>
        <p className="text-muted-foreground mb-6">This resource may have been removed.</p>
        <Button asChild variant="outline"><Link href="/browse">Browse Library</Link></Button>
      </div>
    );
  }

  const canAfford = (user?.unitsBalance || 0) >= resource.downloadCost;
  const remaining = (user?.unitsBalance || 0) - resource.downloadCost;

  return (
    <AuthWrapper>
      <div className="flex flex-col gap-0 max-w-6xl mx-auto pb-12">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 flex-wrap">
          <Link href="/browse" className="flex items-center gap-1 hover:text-primary transition-colors">
            <Folder className="w-3.5 h-3.5" /> Library
          </Link>
          {pathData?.path?.map((f) => (
            <span key={f.id} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              <Link href={`/browse/${f.id}`} className="hover:text-primary transition-colors">{f.name}</Link>
            </span>
          ))}
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{resource.name}</span>
        </nav>

        {/* ── Info + Actions ── */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mb-5">
          {/* colour bar by type */}
          <div className={`h-1.5 w-full ${
            resource.type === "pdf" ? "bg-red-500" :
            resource.type === "slides" ? "bg-orange-500" :
            resource.type === "book" ? "bg-blue-500" :
            resource.type === "notes" ? "bg-green-500" : "bg-primary"
          }`} />

          <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            {/* Left: Title + meta */}
            <div className="flex items-start gap-5 flex-1 min-w-0">
              <div className="hidden sm:flex shrink-0 p-4 rounded-2xl bg-muted">
                <BookOpen className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className={`uppercase text-[11px] tracking-wider border font-semibold ${TYPE_COLORS[resource.type] || ""}`}>
                    {resource.type}
                  </Badge>
                </div>
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground leading-snug mb-2">
                  {resource.name}
                </h1>
                {resource.description && (
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    {resource.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Added {formatDistanceToNow(new Date(resource.createdAt))} ago
                  </span>
                  {formatBytes(resource.fileSize) && (
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5" />
                      {formatBytes(resource.fileSize)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    {resource.viewCount} views
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    {resource.downloadCount} downloads
                  </span>
                </div>
              </div>
            </div>

            {/* Right: cost + download */}
            <div className="shrink-0 flex flex-col gap-3 w-full lg:w-56">
              <div className="rounded-xl border border-border bg-background p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Download Cost
                </p>
                <div className="flex items-center justify-center gap-1.5 text-3xl font-bold">
                  <Zap className="w-6 h-6 text-accent" />
                  <span>{resource.downloadCost}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">units</p>
              </div>

              <Button
                size="lg"
                className="w-full font-bold gap-2 shadow-md hover:shadow-lg transition-shadow"
                onClick={handleDownloadClick}
                disabled={isDownloading || downloadMutation.isPending}
              >
                {isDownloading || downloadMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
                ) : (
                  <><Download className="w-4 h-4" /> Download</>
                )}
              </Button>

              {!canAfford && (
                <p className="text-xs text-destructive text-center">
                  Need {resource.downloadCost - (user?.unitsBalance || 0)} more units.{" "}
                  <Link href="/account" className="underline underline-offset-2">Top up →</Link>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Document Viewer ── */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Viewer toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Document Viewer</span>
              <Badge variant="secondary" className="text-[10px] font-medium">Free</Badge>
            </div>
            {viewData?.url && (
              <a
                href={viewData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
              >
                Open in new tab ↗
              </a>
            )}
          </div>

          {/* Viewer body */}
          {isLoadingView ? (
            <div className="flex flex-col items-center justify-center h-[75vh] bg-muted/20 gap-4 text-muted-foreground">
              <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="font-medium">Loading secure viewer…</p>
            </div>
          ) : isViewError || !viewData?.url ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center p-10 bg-muted/10">
              <FileText className="w-16 h-16 text-muted-foreground opacity-30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Preview unavailable</h3>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                This file can't be previewed directly in the browser. Download it to view it on your device.
              </p>
              <Button className="mt-6 gap-2" onClick={handleDownloadClick}>
                <Download className="w-4 h-4" /> Download to view
              </Button>
            </div>
          ) : (
            <div className="relative w-full" style={{ height: "80vh" }}>
              <iframe
                src={viewData.url}
                className="absolute inset-0 w-full h-full border-none"
                title={resource.name}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Download Confirmation Modal ── */}
      <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Confirm Download
            </DialogTitle>
            <DialogDescription className="pt-1">
              You're about to download <strong>{resource.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Units breakdown */}
          <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-2 text-sm my-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Your balance</span>
              <span className="font-semibold text-foreground">{user?.unitsBalance ?? 0} units</span>
            </div>
            <div className="flex justify-between text-destructive">
              <span>Download cost</span>
              <span className="font-semibold">− {resource.downloadCost} units</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>After download</span>
              <span className={remaining < 0 ? "text-destructive" : "text-primary"}>
                {remaining} units
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsDownloadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => downloadMutation.mutate({ resourceId })}
              disabled={downloadMutation.isPending}
              className="font-bold gap-2"
            >
              {downloadMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><Download className="w-4 h-4" /> Confirm & Download</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthWrapper>
  );
}
