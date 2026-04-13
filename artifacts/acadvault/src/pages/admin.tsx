import { useState, useEffect, useCallback } from "react";
import { AuthWrapper } from "@/components/auth-wrapper";
import {
  useListFolders,
  useCreateFolder,
  useCreateResource,
  useAdminListUsers,
  useAdminUpdateUserRole,
  useAdminGrantUnits,
  useDeleteFolder,
  useDeleteResource,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import {
  FolderPlus,
  UploadCloud,
  Users,
  Shield,
  Zap,
  Trash2,
  Pencil,
  AlertTriangle,
  ClipboardList,
  FileText,
  Folder,
  CheckCircle2,
  XCircle,
  ChevronRight,
  BarChart3,
  Download,
  Eye,
  Star,
  PackageSearch,
  TrendingUp,
  Loader2,
  RefreshCw,
  Building2,
  Mail,
  Clock,
  UserCheck,
  UserX,
  ImageIcon,
  Plus,
  Globe,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BASE_URL } from "@/lib/api";

const folderSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  parentId: z.string().optional().or(z.literal("root")),
});

const grantUnitsSchema = z.object({
  amount: z.coerce.number().min(1),
  description: z.string().min(3),
});

const ACTION_LABELS: Record<string, string> = {
  create_folder: "Folder Created",
  delete_folder: "Folder Deleted",
  upload_resource: "File Uploaded",
  delete_resource: "File Deleted",
  update_resource: "File Updated",
  change_role: "Role Changed",
  grant_units: "Units Granted",
  profile_update: "Profile Updated",
  user_registered: "User Registered",
  units_welcome: "Welcome Bonus",
};

const ACTION_COLORS: Record<string, string> = {
  create_folder: "bg-blue-100 text-blue-700",
  delete_folder: "bg-rose-100 text-rose-700",
  upload_resource: "bg-green-100 text-green-700",
  delete_resource: "bg-rose-100 text-rose-700",
  update_resource: "bg-amber-100 text-amber-700",
  change_role: "bg-violet-100 text-violet-700",
  grant_units: "bg-yellow-100 text-yellow-700",
  profile_update: "bg-cyan-100 text-cyan-700",
  user_registered: "bg-emerald-100 text-emerald-700",
  units_welcome: "bg-emerald-100 text-emerald-700",
};

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [allFoldersForUpload, setAllFoldersForUpload] = useState<any[]>([]);

  const { data: usersData } = useAdminListUsers();
  const { data: foldersData, refetch: refetchFolders } = useListFolders();

  useEffect(() => {
    fetch(`${BASE_URL}api/folders/all`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAllFoldersForUpload(d.folders || []))
      .catch(() => {});
  }, []);

  const updateRoleMutation = useAdminUpdateUserRole({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ title: "Role updated successfully" });
      },
    },
  });

  const handleRoleChange = (userId: string, newRole: "student" | "moderator" | "admin") => {
    updateRoleMutation.mutate({ userId, data: { role: newRole } });
  };

  return (
    <AuthWrapper requireAdmin>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" /> Admin Portal
          </h1>
          <p className="text-muted-foreground mt-2">
            Full control over folders, resources, users, and platform activity.
          </p>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="flex flex-wrap gap-1 w-full max-w-4xl mb-8 h-auto p-1">
            <TabsTrigger value="analytics" className="text-xs h-9 px-3">Analytics</TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs h-9 px-3 gap-1.5">
              Approvals
              <PendingBadge />
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-xs h-9 px-3">Upload</TabsTrigger>
            <TabsTrigger value="files" className="text-xs h-9 px-3">Files</TabsTrigger>
            <TabsTrigger value="folders" className="text-xs h-9 px-3">Folders</TabsTrigger>
            <TabsTrigger value="schools" className="text-xs h-9 px-3">Schools</TabsTrigger>
            <TabsTrigger value="users" className="text-xs h-9 px-3">Users</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs h-9 px-3">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalsTab />
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <ResourceUploadTab folders={allFoldersForUpload.length > 0 ? allFoldersForUpload : (foldersData?.folders || [])} />
          </TabsContent>

          <TabsContent value="files">
            <FilesTab />
          </TabsContent>

          <TabsContent value="folders">
            <FoldersTab folders={foldersData?.folders || []} refetch={refetchFolders} />
          </TabsContent>

          <TabsContent value="schools">
            <SchoolsTab />
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Change roles and grant units to users. New users automatically receive 50 free units.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">User</th>
                        <th className="px-4 py-3">Joined</th>
                        <th className="px-4 py-3">Balance</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3 text-right rounded-tr-lg">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {usersData?.users?.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/20">
                          <td className="px-4 py-4 font-medium text-foreground">
                            {u.firstName
                              ? `${u.firstName} ${u.lastName}`
                              : u.username}
                            <div className="text-xs text-muted-foreground font-normal">
                              {u.username}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {format(new Date(u.createdAt), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 py-4 font-bold text-accent">
                            {u.unitsBalance}
                          </td>
                          <td className="px-4 py-4">
                            {u.isPermanentAdmin ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold">
                                  <Shield className="w-3 h-3" />
                                  Super Admin
                                </span>
                              </div>
                            ) : (
                              <Select
                                defaultValue={u.role}
                                onValueChange={(v) =>
                                  handleRoleChange(u.id, v as any)
                                }
                              >
                                <SelectTrigger className="w-[110px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="student">Student</SelectItem>
                                  <SelectItem value="moderator">Moderator</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <GrantUnitsDialog
                              userId={u.id}
                              userName={u.username || "User"}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogTab />
          </TabsContent>
        </Tabs>
      </div>
    </AuthWrapper>
  );
}

// ── Resource Upload ───────────────────────────────────────────────────────────

function ResourceUploadTab({ folders }: { folders: any[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createResourceMut = useCreateResource({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Resource uploaded successfully" });
        setFile(null);
        setFormKey((k) => k + 1);
        queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      },
      onError: (err: any) => {
        toast({
          title: "Upload Failed",
          description: err.message,
          variant: "destructive",
        });
      },
    },
  });

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0]);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file)
      return toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive",
      });

    const fd = new FormData(e.currentTarget);
    createResourceMut.mutate({
      data: {
        name: fd.get("name") as string,
        description: fd.get("description") as string,
        type: fd.get("type") as string,
        folderId: fd.get("folderId") as string,
        downloadCost: Number(fd.get("downloadCost")),
        tags: fd.get("tags") as string,
        file: file,
      },
    });
  };

  return (
    <Card className="border-border/60 shadow-sm max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-primary" /> Upload New Resource
        </CardTitle>
        <CardDescription>
          Add a new document, slide deck, or video to the library.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form key={formKey} onSubmit={onSubmit} className="space-y-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
            {file ? (
              <div className="font-semibold text-primary">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            ) : (
              <div>
                <p className="font-medium text-foreground">
                  Drag & drop a file here, or click to select
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports PDF, PPTX, DOCX, MP4, etc.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Name *</label>
              <Input
                name="name"
                required
                placeholder="e.g. Intro to Computer Science"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Type *</label>
              <Select name="type" defaultValue="pdf" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="slides">Presentation / Slides</SelectItem>
                  <SelectItem value="notes">Lecture Notes</SelectItem>
                  <SelectItem value="book">E-Book</SelectItem>
                  <SelectItem value="video">Video Lecture</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Folder *</label>
              <Select name="folderId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders?.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {"  ".repeat(f.level || 0)}{(f.level || 0) > 0 ? "└ " : ""}{f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Download Cost (Units) *
              </label>
              <Input
                name="downloadCost"
                type="number"
                defaultValue="5"
                required
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              name="description"
              placeholder="Brief description of this resource..."
              className="resize-none h-20"
            />
          </div>

          <Button
            type="submit"
            disabled={createResourceMut.isPending || !file}
            className="w-full font-bold"
          >
            {createResourceMut.isPending ? "Uploading..." : "Upload Resource"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Files Tab ─────────────────────────────────────────────────────────────────

function FilesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [editResName, setEditResName] = useState("");
  const [editResDesc, setEditResDesc] = useState("");
  const [editResCost, setEditResCost] = useState("5");

  const [resources, setResources] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}api/admin/resources`, { credentials: "include" });
      const data = await res.json();
      setResources(data.resources || []);
    } catch {
      toast({ title: "Error loading files", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const deleteResourceMut = useDeleteResource({
    mutation: {
      onSuccess: () => {
        toast({ title: "File deleted successfully" });
        setConfirmOpen(false);
        setDeleteId(null);
        fetchResources();
        queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      },
      onError: () => {
        toast({ title: "Failed to delete file", variant: "destructive" });
      },
    },
  });

  const confirmDelete = (id: string, name: string) => {
    setDeleteId(id);
    setDeleteName(name);
    setConfirmOpen(true);
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
      fetchResources();
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
    } catch {
      toast({ title: "Failed to update resource", variant: "destructive" });
    }
  };

  const TYPE_COLORS: Record<string, string> = {
    pdf: "bg-rose-100 text-rose-700",
    slides: "bg-blue-100 text-blue-700",
    notes: "bg-green-100 text-green-700",
    book: "bg-violet-100 text-violet-700",
    video: "bg-amber-100 text-amber-700",
    other: "bg-gray-100 text-gray-700",
  };

  return (
    <>
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> All Files
          </CardTitle>
          <CardDescription>
            Manage all uploaded resources across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading files…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Uploaded</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {resources?.map((r) => (
                    <tr key={r.id} className={`hover:bg-muted/20 ${!r.isActive ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">
                        {r.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[r.type] || "bg-gray-100 text-gray-700"}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-accent">{r.downloadCost}</td>
                      <td className="px-4 py-3">
                        {r.isActive ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-500 text-xs font-medium">
                            <XCircle className="w-3.5 h-3.5" /> Deleted
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {format(new Date(r.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.isActive && (
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground h-7 px-2"
                              onClick={() => {
                                setEditingResource(r);
                                setEditResName(r.name);
                                setEditResDesc(r.description || "");
                                setEditResCost(String(r.downloadCost || 5));
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-7 px-2"
                              onClick={() => confirmDelete(r.id, r.name)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {resources?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        No files found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" /> Delete File
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{deleteName}"</strong>?
              It will no longer be accessible to students. This action is logged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteResourceMut.isPending}
              onClick={() => deleteId && deleteResourceMut.mutate({ resourceId: deleteId })}
            >
              {deleteResourceMut.isPending ? "Deleting…" : "Delete File"}
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
    </>
  );
}

// ── Folders Tab ───────────────────────────────────────────────────────────────

function FolderTreeItem({
  folder,
  allFolders,
  depth,
  onEdit,
  onDelete,
}: {
  folder: any;
  allFolders: any[];
  depth: number;
  onEdit: (f: any) => void;
  onDelete: (f: any) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = allFolders.filter((f) => f.parentId === folder.id);

  return (
    <div>
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-card hover:bg-muted/20 transition-colors border-b border-border/30"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          {children.length > 0 && (
            <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
          )}
          {children.length === 0 && <span className="w-3.5" />}
          <Folder className="w-4 h-4 text-primary/60 shrink-0" />
          <div className="min-w-0">
            <span className="font-medium block truncate text-sm">{folder.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
            L{folder.level}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(folder)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
            onClick={() => onDelete(folder)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {expanded &&
        children.map((child) => (
          <FolderTreeItem
            key={child.id}
            folder={child}
            allFolders={allFolders}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

function FoldersTab({ folders, refetch }: { folders: any[]; refetch: () => void }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [allFolders, setAllFolders] = useState<any[] | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof folderSchema>>({
    resolver: zodResolver(folderSchema),
    defaultValues: { parentId: "root" },
  });

  const editForm = useForm<{ name: string; description: string }>({
    defaultValues: { name: "", description: "" },
  });

  const fetchAllFolders = async () => {
    try {
      const res = await fetch(`${BASE_URL}api/folders/all`, { credentials: "include" });
      const data = await res.json();
      setAllFolders(data.folders || []);
    } catch {
      setAllFolders(folders);
    }
  };

  useEffect(() => {
    fetchAllFolders();
  }, []);

  const createFolderMut = useCreateFolder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Folder Created" });
        setIsCreateOpen(false);
        form.reset({ parentId: "root" });
        queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
        fetchAllFolders();
      },
    },
  });

  const deleteFolderMut = useDeleteFolder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Folder deleted", description: "All contents were removed." });
        setDeleteTarget(null);
        queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
        fetchAllFolders();
      },
      onError: () => {
        toast({ title: "Failed to delete folder", variant: "destructive" });
      },
    },
  });

  const handleRename = async (folder: any, data: { name: string; description: string }) => {
    try {
      const res = await fetch(`${BASE_URL}api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Folder renamed successfully" });
      setEditFolder(null);
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      fetchAllFolders();
    } catch {
      toast({ title: "Failed to rename folder", variant: "destructive" });
    }
  };

  const displayFolders = allFolders || folders;
  const rootFolders = displayFolders.filter((f) => !f.parentId);

  return (
    <>
      <Card className="border-border/60 shadow-sm max-w-3xl">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" /> Folder Management
            </CardTitle>
            <CardDescription>
              Create, rename, and delete folders. Deleting a folder removes all its
              contents permanently.
            </CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <FolderPlus className="w-4 h-4" /> New Folder
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/50 overflow-hidden">
            {rootFolders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No folders yet. Create one to get started.
              </p>
            ) : (
              rootFolders.map((f) => (
                <FolderTreeItem
                  key={f.id}
                  folder={f}
                  allFolders={displayFolders}
                  depth={0}
                  onEdit={(folder) => {
                    setEditFolder(folder);
                    editForm.reset({ name: folder.name, description: folder.description || "" });
                  }}
                  onDelete={(folder) => setDeleteTarget(folder)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((d) =>
              createFolderMut.mutate({
                data: {
                  ...d,
                  parentId: d.parentId === "root" ? undefined : d.parentId,
                },
              })
            )}
            className="space-y-4 pt-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                {...form.register("name")}
                placeholder="e.g. Year 1, Computer Science..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                {...form.register("description")}
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Parent Folder</label>
              <Select
                onValueChange={(v) => form.setValue("parentId", v)}
                defaultValue="root"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">-- Root Level --</SelectItem>
                  {displayFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {"  ".repeat(f.level)}{f.level > 0 ? "└ " : ""}{f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              className="w-full mt-4"
              disabled={createFolderMut.isPending}
            >
              Create Folder
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFolder} onOpenChange={(o) => !o && setEditFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((d) => handleRename(editFolder, d))}
            className="space-y-4 pt-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input {...editForm.register("name")} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input {...editForm.register("description")} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditFolder(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" /> Delete Folder
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                You are about to permanently delete{" "}
                <strong>"{deleteTarget?.name}"</strong> and all nested content.
              </p>
              <p className="text-muted-foreground text-sm">This action cannot be undone.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteFolderMut.isPending}
              onClick={() =>
                deleteTarget &&
                deleteFolderMut.mutate({ folderId: deleteTarget.id })
              }
            >
              {deleteFolderMut.isPending ? "Deleting…" : "Delete Everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Grant Units Dialog ────────────────────────────────────────────────────────

function GrantUnitsDialog({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof grantUnitsSchema>>({
    resolver: zodResolver(grantUnitsSchema),
  });

  const mut = useAdminGrantUnits({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Units Granted",
          description: `Successfully granted to ${userName}`,
        });
        setIsOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      },
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 border-accent/30 text-accent hover:bg-accent/10 hover:text-accent-foreground h-8 px-2 text-xs"
        >
          <Zap className="w-3 h-3" /> Grant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant Units to {userName}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((d) => mut.mutate({ userId, data: d }))}
          className="space-y-4 pt-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              {...form.register("amount")}
              placeholder="e.g. 50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Reason)</label>
            <Input
              {...form.register("description")}
              placeholder="e.g. Reward for contribution"
            />
          </div>
          <Button
            type="submit"
            className="w-full mt-4"
            disabled={mut.isPending}
          >
            Confirm Grant
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  color = "text-primary",
}: {
  label: string;
  value: string | number;
  icon: any;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}api/admin/analytics`, { credentials: "include" });
      const d = await res.json();
      setData(d);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const overview = data?.overview || {};
  const topResources = data?.topResources || [];
  const resourcesByType = data?.resourcesByType || [];
  const recentUsers = data?.recentUsers || [];

  const TYPE_COLORS_BAR: Record<string, string> = {
    pdf: "bg-rose-500",
    slides: "bg-orange-500",
    notes: "bg-green-500",
    book: "bg-blue-500",
    video: "bg-purple-500",
    other: "bg-gray-400",
  };

  const maxDownloads = topResources[0]?.downloadCount || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Platform Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Live overview of platform activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={overview.totalUsers ?? 0} icon={Users} color="text-blue-500" />
        <StatCard label="Resources" value={overview.totalResources ?? 0} icon={FileText} color="text-green-500" />
        <StatCard label="Total Downloads" value={overview.totalDownloads ?? 0} icon={Download} color="text-orange-500" />
        <StatCard label="Total Views" value={overview.totalViews ?? 0} icon={Eye} color="text-purple-500" />
        <StatCard label="Units Circulating" value={overview.unitsCirculating ?? 0} icon={Zap} color="text-yellow-500" sub="across all wallets" />
        <StatCard label="Units Granted" value={overview.unitsGranted ?? 0} icon={TrendingUp} color="text-emerald-500" sub="all time" />
        <StatCard
          label="Avg Rating"
          value={overview.avgRating ? `${Number(overview.avgRating).toFixed(1)} ★` : "N/A"}
          icon={Star}
          color="text-yellow-400"
          sub={`${overview.totalRatings ?? 0} reviews`}
        />
        <StatCard label="Pending Requests" value={overview.pendingRequests ?? 0} icon={PackageSearch} color="text-rose-500" sub="material requests" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" /> Top Downloaded Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topResources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No downloads yet</p>
            ) : (
              topResources.map((r: any, i: number) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(r.downloadCount / maxDownloads) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{r.downloadCount} dl</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Resources by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resourcesByType.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No resources yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {resourcesByType.map((t: any) => (
                    <div
                      key={t.type}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS_BAR[t.type] || "bg-gray-400"}`} />
                      <span className="text-sm font-medium capitalize">{t.type}</span>
                      <span className="text-sm font-bold text-muted-foreground">{t.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Recently Joined
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.firstName ? `${u.firstName} ${u.lastName}` : u.username || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {u.role}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────────

function AuditLogTab() {
  const [logs, setLogs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}api/admin/audit-logs`, { credentials: "include" });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      toast({ title: "Error loading audit logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (logs === null && !loading) fetchLogs();

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Audit Log
          </CardTitle>
          <CardDescription>
            All critical actions are recorded here for accountability.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : logs?.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No activity recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {logs?.map((log) => {
              const actor =
                log.actorFirstName
                  ? `${log.actorFirstName} ${log.actorLastName || ""}`.trim()
                  : log.actorUsername || log.actorId;
              let details: Record<string, unknown> = {};
              try {
                details = log.details ? JSON.parse(log.details) : {};
              } catch {}
              return (
                <div
                  key={log.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-muted/20"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                        ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {actor}
                      </p>
                      {Object.keys(details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {Object.entries(details)
                            .filter(([k]) => k !== "cascadeIds")
                            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(log.createdAt), "MMM d, yyyy · h:mm a")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Pending badge (live count) ─────────────────────────────────────────────────
function PendingBadge() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    fetch(`${BASE_URL}api/admin/users/pending`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCount(data.length); })
      .catch(() => {});
  }, []);
  if (!count) return null;
  return (
    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
      {count}
    </span>
  );
}

// ── Approvals Tab ─────────────────────────────────────────────────────────────
type PendingUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  program: string | null;
  academicYear: string | null;
  semester: string | null;
  schoolId: string | null;
  institutionalEmail: string | null;
  studentIdImageUrl: string | null;
  approvalStatus: string;
  rejectionReason: string | null;
  createdAt: string;
};

function ApprovalsTab() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewId, setViewId] = useState<PendingUser | null>(null);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}api/admin/users/pending`, { credentials: "include" });
      const data = await r.json();
      setUsers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function approve(userId: string) {
    setActing(userId);
    try {
      const r = await fetch(`${BASE_URL}api/admin/users/${userId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed");
      toast({ title: "User approved", description: "Confirmation email sent." });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      toast({ title: "Failed to approve user", variant: "destructive" });
    } finally {
      setActing(null);
    }
  }

  async function reject(userId: string, reason: string) {
    setActing(userId);
    try {
      const r = await fetch(`${BASE_URL}api/admin/users/${userId}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!r.ok) throw new Error("Failed");
      toast({ title: "User rejected", description: "Rejection email sent." });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setRejectDialog(null);
      setRejectReason("");
    } catch {
      toast({ title: "Failed to reject user", variant: "destructive" });
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" /> Pending Approvals
            </CardTitle>
            <CardDescription>
              Review and approve or reject newly registered users. Approved users receive a confirmation email.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500/50" />
              <p className="font-semibold">No pending approvals</p>
              <p className="text-sm mt-1">All registrations have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="border border-border/60 rounded-xl p-5 bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {u.firstName || u.nickname
                            ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.nickname
                            : "Unknown User"}
                        </span>
                        {u.nickname && (
                          <Badge variant="outline" className="text-xs">{u.nickname}</Badge>
                        )}
                        <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Pending
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {u.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {u.email}
                          </span>
                        )}
                        {u.institutionalEmail && (
                          <span className="flex items-center gap-1 text-accent">
                            <Mail className="w-3 h-3" /> {u.institutionalEmail} (institutional)
                          </span>
                        )}
                        {u.schoolId && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {u.schoolId}
                          </span>
                        )}
                        {u.program && (
                          <span>{u.program} · Year {u.academicYear} · Sem {u.semester}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Registered {format(new Date(u.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {u.studentIdImageUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => setViewId(u)}
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> View ID
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50"
                        disabled={acting === u.id}
                        onClick={() => { setRejectDialog(u); setRejectReason(""); }}
                      >
                        <UserX className="w-3.5 h-3.5" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs bg-green-600 hover:bg-green-500 text-white"
                        disabled={acting === u.id}
                        onClick={() => approve(u.id)}
                      >
                        {acting === u.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Student ID Dialog */}
      <Dialog open={!!viewId} onOpenChange={() => setViewId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Student ID — {viewId?.firstName || viewId?.nickname || "User"}</DialogTitle>
          </DialogHeader>
          {viewId?.studentIdImageUrl && (
            <img
              src={viewId.studentIdImageUrl}
              alt="Student ID"
              className="w-full rounded-lg border border-border"
            />
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              className="border-red-200 text-red-600"
              onClick={() => { setRejectDialog(viewId); setViewId(null); setRejectReason(""); }}
            >
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-500 text-white gap-2"
              onClick={() => { approve(viewId!.id); setViewId(null); }}
            >
              <UserCheck className="w-4 h-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Provide a reason so the user understands what went wrong and what they can do.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm font-semibold">Reason (optional)</Label>
            <Textarea
              placeholder="e.g. The student ID provided is not clearly visible…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-500 text-white gap-2"
              disabled={acting === rejectDialog?.id}
              onClick={() => reject(rejectDialog!.id, rejectReason)}
            >
              {acting === rejectDialog?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Schools Tab ───────────────────────────────────────────────────────────────
type School = { id: string; name: string; shortName?: string; country: string; emailDomain?: string; isActive: boolean; createdAt: string };

function SchoolsTab() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", shortName: "", country: "Zambia", emailDomain: "" });
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}api/schools`, { credentials: "include" });
      const data = await r.json();
      setSchools(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addSchool() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE_URL}api/admin/schools`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Failed");
      toast({ title: "School added" });
      setForm({ name: "", shortName: "", country: "Zambia", emailDomain: "" });
      setShowAdd(false);
      load();
    } catch {
      toast({ title: "Failed to add school", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent" /> Institutions
          </CardTitle>
          <CardDescription>
            Manage the schools, colleges, and universities on the platform. Users select their institution during onboarding.
          </CardDescription>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4" /> Add School
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <div className="border border-accent/20 bg-accent/5 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-sm">New Institution</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Full name *</Label>
                <Input
                  placeholder="University of Zambia"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Short name / Abbreviation</Label>
                <Input
                  placeholder="UNZA"
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Country</Label>
                <Input
                  placeholder="Zambia"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Email domain (optional)
                </Label>
                <Input
                  placeholder="unza.zm"
                  value={form.emailDomain}
                  onChange={(e) => setForm({ ...form, emailDomain: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  e.g. <code>unza.zm</code> — used for auto-matching institutional emails.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={addSchool} disabled={saving || !form.name.trim()} className="gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add Institution
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No institutions added yet.</p>
            <p className="text-xs mt-1">Add your first institution to allow users to enrol.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Institution</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Email Domain</th>
                  <th className="px-4 py-3 rounded-tr-lg">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {schools.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#142042] flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-white/70" />
                        </div>
                        <div>
                          <div className="font-semibold">{s.name}</div>
                          {s.shortName && <div className="text-xs text-muted-foreground">{s.shortName}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{s.country}</td>
                    <td className="px-4 py-4 text-muted-foreground font-mono text-xs">
                      {s.emailDomain || "—"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {format(new Date(s.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
