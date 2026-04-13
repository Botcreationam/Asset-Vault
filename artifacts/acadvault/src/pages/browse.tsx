import { useState } from "react";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { useListFolders, useListResources, useGetFolderPath, useCreateFolder, useDeleteFolder, useDeleteResource } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { AuthWrapper } from "@/components/auth-wrapper";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Folder as FolderIcon,
  FileText,
  File as FileIcon,
  Video,
  Presentation,
  Book,
  ChevronRight,
  Download,
  Zap,
  FolderPlus,
  Pencil,
  Trash2,
  AlertTriangle,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getResourceIcon = (type: string) => {
  switch (type) {
    case "pdf": return <FileText className="w-8 h-8 text-red-500" />;
    case "slides": return <Presentation className="w-8 h-8 text-orange-500" />;
    case "book": return <Book className="w-8 h-8 text-blue-500" />;
    case "video": return <Video className="w-8 h-8 text-purple-500" />;
    case "notes": return <FileText className="w-8 h-8 text-green-500" />;
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDesc, setFolderDesc] = useState("");
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deleteFolder, setDeleteFolder] = useState<any>(null);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [editResName, setEditResName] = useState("");
  const [editResDesc, setEditResDesc] = useState("");
  const [editResCost, setEditResCost] = useState("5");
  const [deleteResource, setDeleteResource] = useState<any>(null);

  const { data: folderData, isLoading: isLoadingFolders } = useListFolders({ parentId: folderId });
  const { data: resourceData, isLoading: isLoadingResources } = useListResources(
    { folderId: folderId || "root" },
    { query: { enabled: !!folderId } }
  );
  const { data: pathData } = useGetFolderPath(folderId || "", {
    query: { enabled: !!folderId },
  });

  const createFolderMut = useCreateFolder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Folder created" });
        setCreateOpen(false);
        setFolderName("");
        setFolderDesc("");
        queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      },
      onError: () => {
        toast({ title: "Failed to create folder", variant: "destructive" });
      },
    },
  });

  const deleteFolderMut = useDeleteFolder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Folder deleted" });
        setDeleteFolder(null);
        queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      },
      onError: () => {
        toast({ title: "Failed to delete folder", variant: "destructive" });
      },
    },
  });

  const deleteResourceMut = useDeleteResource({
    mutation: {
      onSuccess: () => {
        toast({ title: "Resource deleted" });
        setDeleteResource(null);
        queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
        queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      },
      onError: () => {
        toast({ title: "Failed to delete resource", variant: "destructive" });
      },
    },
  });

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    const siblings = folderData?.folders || [];
    if (siblings.some((f: any) => f.name.toLowerCase() === folderName.trim().toLowerCase())) {
      toast({ title: "A folder with this name already exists here", variant: "destructive" });
      return;
    }
    createFolderMut.mutate({
      data: {
        name: folderName.trim(),
        description: folderDesc.trim() || undefined,
        parentId: folderId || undefined,
      },
    });
  };

  const handleRenameFolder = async () => {
    if (!editingFolder || !editName.trim()) return;
    const siblings = folderData?.folders || [];
    if (siblings.some((f: any) => f.id !== editingFolder.id && f.name.toLowerCase() === editName.trim().toLowerCase())) {
      toast({ title: "A folder with this name already exists here", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}api/folders/${editingFolder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Folder renamed" });
      setEditingFolder(null);
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folder-path"] });
    } catch {
      toast({ title: "Failed to rename folder", variant: "destructive" });
    }
  };

  const handleEditResource = async () => {
    if (!editingResource || !editResName.trim()) return;
    try {
      const res = await fetch(`${BASE_URL}api/resources/${editingResource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editResName.trim(),
          description: editResDesc.trim(),
          downloadCost: parseInt(editResCost) || 5,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Resource updated" });
      setEditingResource(null);
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
    } catch {
      toast({ title: "Failed to update resource", variant: "destructive" });
    }
  };

  return (
    <AuthWrapper>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto pb-2">
          <Link href="/browse" className="hover:text-primary transition-colors font-medium flex items-center gap-1 shrink-0">
            <FolderIcon className="w-4 h-4" /> root
          </Link>
          {pathData?.path?.map((folder: any) => (
            <div key={folder.id} className="flex items-center gap-2 shrink-0">
              <ChevronRight className="w-4 h-4" />
              <Link href={`/browse/${folder.id}`} className="hover:text-primary transition-colors font-medium">
                {folder.name}
              </Link>
            </div>
          ))}
        </div>

        <div className="flex items-start justify-between gap-4">
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
          {isAdmin && (
            <Button size="sm" className="gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
              <FolderPlus className="w-4 h-4" /> New Folder
            </Button>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-primary" /> Folders
          </h2>

          {isLoadingFolders ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : folderData?.folders?.length === 0 ? (
            <div className="p-8 text-center bg-card border border-border border-dashed rounded-xl">
              <p className="text-muted-foreground">No subfolders found.</p>
              {isAdmin && (
                <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" /> Create one
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {folderData?.folders?.map((folder: any) => (
                <div key={folder.id} className="relative group">
                  <Link href={`/browse/${folder.id}`}>
                    <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5 border-border/60 bg-card/50 hover:bg-card">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-primary">
                          <FolderIcon className="w-6 h-6 fill-current opacity-20" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {folder.name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {folder.subfolderCount || 0} folders, {folder.resourceCount || 0} files
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  {isAdmin && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="sm" className="h-7 w-7 p-0 shadow-sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingFolder(folder);
                            setEditName(folder.name);
                            setEditDesc(folder.description || "");
                          }}>
                            <Pencil className="w-4 h-4 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteFolder(folder)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {folderId && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Resources
            </h2>

            {isLoadingResources ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
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
                {resourceData?.resources?.map((resource: any) => (
                  <div key={resource.id} className="relative group">
                    <Link href={`/resource/${resource.id}`}>
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
                              <Badge variant="secondary" className="uppercase text-[10px] hidden sm:inline-flex">
                                {resource.type}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                              <span>{formatBytes(resource.fileSize)}</span>
                              <span className="hidden sm:inline">·</span>
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
                    {isAdmin && (
                      <div className="absolute top-3 right-16 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm" className="h-7 w-7 p-0 shadow-sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingResource(resource);
                              setEditResName(resource.name);
                              setEditResDesc(resource.description || "");
                              setEditResCost(String(resource.downloadCost || 5));
                            }}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteResource(resource)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                {folderId
                  ? `This folder will be created inside "${pathData?.path?.[pathData.path.length - 1]?.name || "current folder"}".`
                  : "This folder will be created at the root level."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Folder Name</label>
                <Input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. Year 1, Computer Science..."
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  value={folderDesc}
                  onChange={(e) => setFolderDesc(e.target.value)}
                  placeholder="Brief description..."
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateFolder} disabled={createFolderMut.isPending || !folderName.trim()}>
                  {createFolderMut.isPending ? "Creating..." : "Create Folder"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingFolder} onOpenChange={(o) => !o && setEditingFolder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingFolder(null)}>Cancel</Button>
                <Button onClick={handleRenameFolder} disabled={!editName.trim()}>Save Changes</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteFolder} onOpenChange={(o) => !o && setDeleteFolder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" /> Delete Folder
              </DialogTitle>
              <DialogDescription className="space-y-2 pt-2">
                <p>
                  You are about to permanently delete <strong>"{deleteFolder?.name}"</strong>.
                </p>
                {(deleteFolder?.resourceCount > 0 || deleteFolder?.subfolderCount > 0) && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    This folder contains{" "}
                    <strong>{deleteFolder?.resourceCount} file(s)</strong> and{" "}
                    <strong>{deleteFolder?.subfolderCount} subfolder(s)</strong> which will all be permanently removed.
                  </div>
                )}
                <p className="text-muted-foreground text-sm">This action cannot be undone.</p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteFolder(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteFolderMut.isPending}
                onClick={() => deleteFolder && deleteFolderMut.mutate({ folderId: deleteFolder.id })}
              >
                {deleteFolderMut.isPending ? "Deleting..." : "Delete Everything"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingResource} onOpenChange={(o) => !o && setEditingResource(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Resource</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={editResName} onChange={(e) => setEditResName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input value={editResDesc} onChange={(e) => setEditResDesc(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Download Cost (Units)</label>
                <Input type="number" value={editResCost} onChange={(e) => setEditResCost(e.target.value)} min="0" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingResource(null)}>Cancel</Button>
                <Button onClick={handleEditResource} disabled={!editResName.trim()}>Save Changes</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteResource} onOpenChange={(o) => !o && setDeleteResource(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" /> Delete Resource
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>"{deleteResource?.name}"</strong>?
                It will no longer be accessible to students.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteResource(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteResourceMut.isPending}
                onClick={() => deleteResource && deleteResourceMut.mutate({ resourceId: deleteResource.id })}
              >
                {deleteResourceMut.isPending ? "Deleting..." : "Delete Resource"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthWrapper>
  );
}
