import { useRoute } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { 
  useGetResource, 
  useViewResource, 
  useDownloadResource, 
  useGetFolderPath 
} from "@workspace/api-client-react";
import { AuthWrapper } from "@/components/auth-wrapper";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  FileText, Download, Eye, Clock, Hash, Zap, AlertTriangle, CheckCircle2, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Link } from "wouter";

export default function ResourceDetail() {
  const [, params] = useRoute("/resource/:resourceId");
  const resourceId = params?.resourceId || "";
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const { data: resource, isLoading: isLoadingResource } = useGetResource(resourceId, {
    query: { enabled: !!resourceId }
  });
  
  const { data: viewData, isLoading: isLoadingView, isError: isViewError } = useViewResource(resourceId, {
    query: { enabled: !!resourceId, retry: false }
  });

  const { data: pathData } = useGetFolderPath(resource?.folderId || '', {
    query: { enabled: !!resource?.folderId }
  });

  const downloadMutation = useDownloadResource({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Download Ready",
          description: `Spent ${data.unitsSpent} units. New balance: ${data.newBalance}`,
        });
        setIsDownloadModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/units/balance"] });
        // Trigger download
        window.open(data.url, "_blank");
      },
      onError: (error: any) => {
        toast({
          title: "Download Failed",
          description: error.message || "Not enough units or server error",
          variant: "destructive"
        });
      }
    }
  });

  const handleDownloadClick = () => {
    if (!resource) return;
    if ((user?.unitsBalance || 0) < resource.downloadCost) {
      toast({
        title: "Insufficient Units",
        description: `You need ${resource.downloadCost} units, but only have ${user?.unitsBalance}. Go to Account to top up.`,
        variant: "destructive"
      });
      return;
    }
    setIsDownloadModalOpen(true);
  };

  const confirmDownload = () => {
    downloadMutation.mutate({ resourceId });
  };

  if (isLoadingResource) {
    return (
      <AuthWrapper>
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </div>
      </AuthWrapper>
    );
  }

  if (!resource) return <div className="p-8 text-center">Resource not found</div>;

  return (
    <AuthWrapper>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
        {/* Header / Meta Card */}
        <Card className="bg-card shadow-lg border-border/60 overflow-hidden">
          <div className="bg-primary/5 h-2 w-full" />
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
              <div className="flex items-start gap-6">
                <div className="bg-primary/10 p-4 rounded-2xl text-primary shrink-0 hidden sm:block">
                  <FileText className="w-12 h-12" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="uppercase tracking-wider">{resource.type}</Badge>
                    {pathData && pathData.path.length > 0 && (
                      <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                        in <Link href={`/browse/${resource.folderId}`} className="hover:text-primary hover:underline">{pathData.path[pathData.path.length-1].name}</Link>
                      </span>
                    )}
                  </div>
                  <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
                    {resource.name}
                  </h1>
                  <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                    {resource.description || "No description provided."}
                  </p>
                  
                  <div className="flex flex-wrap gap-4 mt-6 text-sm text-muted-foreground font-medium bg-secondary/20 p-3 rounded-lg border border-secondary/30 inline-flex">
                    <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Added {formatDistanceToNow(new Date(resource.createdAt))} ago</div>
                    {resource.fileSize && <div className="flex items-center gap-1.5"><Hash className="w-4 h-4" /> {(resource.fileSize / 1024 / 1024).toFixed(2)} MB</div>}
                    <div className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {resource.viewCount} views</div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-3 w-full lg:w-auto">
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
                  <p className="text-sm text-muted-foreground font-medium mb-1">Download Cost</p>
                  <div className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
                    <Zap className="w-6 h-6 text-accent" /> {resource.downloadCost} <span className="text-base font-medium text-muted-foreground">units</span>
                  </div>
                </div>
                <Button 
                  size="lg" 
                  className="w-full font-bold shadow-md hover:shadow-lg transition-all"
                  onClick={handleDownloadClick}
                >
                  <Download className="w-5 h-5 mr-2" /> Download File
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Viewer Section */}
        <Card className="bg-card shadow-lg border-border/60">
          <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl font-serif">
                <Eye className="w-5 h-5 text-primary" /> View Document (Free)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingView ? (
              <div className="flex items-center justify-center h-[600px] bg-muted/30">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="font-medium">Loading secure viewer...</p>
                </div>
              </div>
            ) : isViewError || !viewData?.url ? (
              <div className="flex flex-col items-center justify-center h-[400px] bg-muted/20 text-center p-8">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Viewer Unavailable</h3>
                <p className="text-muted-foreground max-w-md">
                  This file type might not be supported for in-browser viewing, or the secure link could not be generated. Please download the file to view it.
                </p>
              </div>
            ) : (
              <div className="w-full h-[700px] bg-neutral-900 relative">
                <iframe 
                  src={viewData.url} 
                  className="w-full h-full border-none"
                  title={resource.name}
                  // adding sandbox for security, though read-only signed URLs usually handle this
                  sandbox="allow-same-origin allow-scripts allow-popups"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Download Confirmation Modal */}
      <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-5 h-5 text-accent" /> Confirm Download
            </DialogTitle>
            <DialogDescription className="text-base pt-4 leading-relaxed">
              Downloading <strong>{resource.name}</strong> will deduct <strong className="text-foreground">{resource.downloadCost} units</strong> from your balance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-secondary/20 p-4 rounded-lg my-2 border border-secondary/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Current Balance</span>
              <span className="font-bold">{user?.unitsBalance} units</span>
            </div>
            <div className="flex justify-between items-center mb-2 text-destructive font-medium">
              <span className="text-sm">Cost</span>
              <span>- {resource.downloadCost} units</span>
            </div>
            <div className="h-px w-full bg-border my-2" />
            <div className="flex justify-between items-center font-bold">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className="text-primary">{(user?.unitsBalance || 0) - resource.downloadCost} units</span>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDownloadModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={confirmDownload} 
              disabled={downloadMutation.isPending}
              className="font-bold"
            >
              {downloadMutation.isPending ? "Processing..." : "Confirm & Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthWrapper>
  );
}
