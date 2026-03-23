import { useRoute } from "wouter";
import { Link } from "wouter";
import { useListFolders, useListResources, useGetFolderPath } from "@workspace/api-client-react";
import { AuthWrapper } from "@/components/auth-wrapper";
import { formatDistanceToNow } from "date-fns";
import { 
  Folder as FolderIcon, 
  FileText, 
  File as FileIcon, 
  Video, 
  Presentation, 
  Book,
  ChevronRight,
  MoreVertical,
  Download
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const getResourceIcon = (type: string) => {
  switch(type) {
    case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
    case 'slides': return <Presentation className="w-8 h-8 text-orange-500" />;
    case 'book': return <Book className="w-8 h-8 text-blue-500" />;
    case 'video': return <Video className="w-8 h-8 text-purple-500" />;
    case 'notes': return <FileText className="w-8 h-8 text-green-500" />;
    default: return <FileIcon className="w-8 h-8 text-gray-500" />;
  }
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  else return (bytes / 1048576).toFixed(1) + " MB";
};

export default function Browse() {
  const [match, params] = useRoute("/browse/:folderId?");
  const folderId = params?.folderId;

  const { data: folderData, isLoading: isLoadingFolders } = useListFolders({ parentId: folderId });
  const { data: resourceData, isLoading: isLoadingResources } = useListResources({ folderId: folderId || 'root' }, { 
    query: { enabled: !!folderId } // Only load resources if we're inside a folder
  });
  const { data: pathData } = useGetFolderPath(folderId || '', {
    query: { enabled: !!folderId }
  });

  return (
    <AuthWrapper>
      <div className="flex flex-col gap-6 pb-12">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto pb-2">
          <Link href="/browse" className="hover:text-primary transition-colors font-medium flex items-center gap-1 shrink-0">
            <FolderIcon className="w-4 h-4" /> root
          </Link>
          {pathData?.path?.map((folder) => (
            <div key={folder.id} className="flex items-center gap-2 shrink-0">
              <ChevronRight className="w-4 h-4" />
              <Link href={`/browse/${folder.id}`} className="hover:text-primary transition-colors font-medium">
                {folder.name}
              </Link>
            </div>
          ))}
        </div>

        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
            {pathData?.path?.length ? pathData.path[pathData.path.length - 1].name : "Browse Library"}
          </h1>
          <p className="text-muted-foreground">
            {pathData?.path?.length 
              ? pathData.path[pathData.path.length - 1].description || "Select a subfolder or view resources below." 
              : "Navigate through our organized academic structure."}
          </p>
        </div>

        {/* Folders Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-primary" /> Folders
          </h2>
          
          {isLoadingFolders ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : folderData?.folders?.length === 0 ? (
            <div className="p-8 text-center bg-card border border-border border-dashed rounded-xl">
              <p className="text-muted-foreground">No subfolders found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {folderData?.folders?.map((folder) => (
                <Link key={folder.id} href={`/browse/${folder.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5 border-border/60 bg-card/50 hover:bg-card">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-primary">
                        <FolderIcon className="w-6 h-6 fill-current opacity-20" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{folder.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {folder.subfolderCount || 0} folders, {folder.resourceCount || 0} files
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Resources List (Only if inside a folder) */}
        {folderId && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Resources
            </h2>

            {isLoadingResources ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : resourceData?.resources?.length === 0 ? (
              <div className="p-12 text-center bg-card border border-border border-dashed rounded-xl flex flex-col items-center">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <FileIcon className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="font-semibold text-lg">No resources yet</h3>
                <p className="text-muted-foreground mt-1">This folder doesn't contain any files directly.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {resourceData?.resources?.map((resource) => (
                  <Link key={resource.id} href={`/resource/${resource.id}`}>
                    <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group bg-card hover:bg-card/90">
                      <CardContent className="p-4 flex items-center gap-4 sm:gap-6">
                        <div className="shrink-0 p-2 bg-background rounded-lg border border-border/50 shadow-sm group-hover:scale-110 transition-transform">
                          {getResourceIcon(resource.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-base sm:text-lg truncate group-hover:text-primary transition-colors">
                              {resource.name}
                            </h3>
                            <Badge variant="secondary" className="uppercase text-[10px] hidden sm:inline-flex">{resource.type}</Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                            <span>{formatBytes(resource.fileSize)}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>Added {formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-4">
                          <div className="hidden sm:flex flex-col items-end mr-4">
                            <span className="text-xs font-medium text-muted-foreground">Cost</span>
                            <div className="flex items-center gap-1 text-accent font-bold">
                              <Zap className="w-3.5 h-3.5" /> {resource.downloadCost}
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-primary">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AuthWrapper>
  );
}
