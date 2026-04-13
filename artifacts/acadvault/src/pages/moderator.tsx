import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthWrapper } from "@/components/auth-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  FolderPlus,
  Trash2,
  Pencil,
  PackageSearch,
  Newspaper,
  FileText,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BASE_URL = import.meta.env.BASE_URL;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  fulfilled: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function Moderator() {
  return (
    <AuthWrapper requireModerator>
      <ModeratorPortal />
    </AuthWrapper>
  );
}

function ModeratorPortal() {
  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" /> Moderator Portal
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage content, moderate posts, and respond to material requests.
        </p>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg mb-8 h-12">
          <TabsTrigger value="requests" className="text-sm h-10">
            Requests
          </TabsTrigger>
          <TabsTrigger value="posts" className="text-sm h-10">
            Posts
          </TabsTrigger>
          <TabsTrigger value="folders" className="text-sm h-10">
            Folders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <MaterialRequestsTab />
        </TabsContent>

        <TabsContent value="posts">
          <PostsModerationTab />
        </TabsContent>

        <TabsContent value="folders">
          <FoldersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MaterialRequestsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("in_progress");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/material-requests"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/material-requests`, { credentials: "include" });
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note: string }) => {
      const res = await fetch(`${BASE_URL}api/material-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, adminNote: note }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/material-requests"] });
      setSelected(null);
    },
    onError: () => toast({ title: "Failed to update request", variant: "destructive" }),
  });

  const requests: any[] = data?.requests ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageSearch className="w-5 h-5 text-primary" /> Material Requests
        </CardTitle>
        <CardDescription>Review and respond to student material requests.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
        ) : requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{r.username || r.firstName || "—"}</TableCell>
                    <TableCell>{r.subject || "—"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? ""}`}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.createdAt ? formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => { setSelected(r); setNote(r.adminNote ?? ""); setStatus(r.status); }}>
                        Respond
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>{selected?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Note to student</label>
              <Textarea
                placeholder="Optional message for the student…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate({ id: selected.id, status, note })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PostsModerationTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ type: "post" | "comment"; postId: number; commentId?: number } | null>(null);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/social/posts"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/social/posts?limit=50`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: commentsData } = useQuery<any>({
    queryKey: ["/api/social/posts", expandedPost, "comments"],
    enabled: !!expandedPost,
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/social/posts/${expandedPost}/comments`, { credentials: "include" });
      return res.json();
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await fetch(`${BASE_URL}api/social/posts/${postId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Post removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Failed to remove post", variant: "destructive" }),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async ({ postId, commentId }: { postId: number; commentId: number }) => {
      const res = await fetch(`${BASE_URL}api/social/posts/${postId}/comments/${commentId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Comment removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts", expandedPost, "comments"] });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Failed to remove comment", variant: "destructive" }),
  });

  const posts: any[] = data?.posts ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" /> Posts &amp; Comments
        </CardTitle>
        <CardDescription>Review and moderate community posts and comments.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No posts found.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post: any) => (
              <div key={post.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">
                        {post.author?.username || post.author?.firstName || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ""}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">{post.likesCount ?? 0} likes · {post.commentsCount ?? 0} comments</span>
                      {post.commentsCount > 0 && (
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                        >
                          {expandedPost === post.id ? "Hide comments" : "View comments"}
                        </button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 flex-shrink-0"
                    onClick={() => setDeleteTarget({ type: "post", postId: post.id })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {expandedPost === post.id && commentsData?.comments && (
                  <div className="mt-3 pl-4 border-l-2 border-border space-y-2">
                    {commentsData.comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No comments.</p>
                    ) : (
                      commentsData.comments.map((c: any) => (
                        <div key={c.id} className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold">{c.author?.username || c.author?.firstName || "Unknown"}: </span>
                            <span className="text-xs text-foreground/80">{c.content}</span>
                          </div>
                          <button
                            className="text-destructive hover:text-destructive/70 flex-shrink-0 ml-1"
                            onClick={() => setDeleteTarget({ type: "comment", postId: post.id, commentId: c.id })}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.type === "post" ? "Post" : "Comment"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the {deleteTarget?.type === "post" ? "post and all its comments" : "comment"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "post") {
                  deletePostMutation.mutate(deleteTarget.postId);
                } else if (deleteTarget.commentId) {
                  deleteCommentMutation.mutate({ postId: deleteTarget.postId, commentId: deleteTarget.commentId });
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function FoldersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/folders/all"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/folders/all`, { credentials: "include" });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${BASE_URL}api/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Folder created" });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders/all"] });
      setNewName("");
      setCreating(false);
    },
    onError: () => toast({ title: "Failed to create folder", variant: "destructive" }),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`${BASE_URL}api/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Folder renamed" });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders/all"] });
      setRenaming(null);
    },
    onError: () => toast({ title: "Failed to rename folder", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE_URL}api/folders/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Folder deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders/all"] });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Failed to delete folder", variant: "destructive" }),
  });

  const folders: any[] = data?.folders ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Folders
            </CardTitle>
            <CardDescription>Create, rename, or remove library folders.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreating(true)} className="gap-1">
            <FolderPlus className="w-4 h-4" /> New Folder
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {creating && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <Input
              placeholder="Folder name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && newName.trim() && createMutation.mutate(newName.trim())}
              autoFocus
            />
            <Button size="sm" onClick={() => createMutation.mutate(newName.trim())} disabled={!newName.trim() || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewName(""); }}>Cancel</Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
        ) : folders.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No folders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Resources</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {folders.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      {renaming?.id === f.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={renaming.name}
                            onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && renaming.name.trim()) renameMutation.mutate({ id: f.id, name: renaming.name.trim() });
                              if (e.key === "Escape") setRenaming(null);
                            }}
                          />
                          <Button size="sm" className="h-7 text-xs" onClick={() => renameMutation.mutate({ id: f.id, name: renaming.name.trim() })} disabled={!renaming.name.trim()}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRenaming(null)}>Cancel</Button>
                        </div>
                      ) : f.name}
                    </TableCell>
                    <TableCell>{f.resourceCount ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {f.createdAt ? formatDistanceToNow(new Date(f.createdAt), { addSuffix: true }) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRenaming({ id: f.id, name: f.name })}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(f.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the folder and all resources inside it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
