import { useState } from "react";
import { AuthWrapper } from "@/components/auth-wrapper";
import { 
  useListFolders, 
  useCreateFolder, 
  useCreateResource, 
  useAdminListUsers, 
  useAdminUpdateUserRole, 
  useAdminGrantUnits 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { 
  FolderPlus, UploadCloud, Users, Shield, Zap, Search, Plus
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Form schemas
const folderSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  parentId: z.string().optional().or(z.literal("root")),
});

const grantUnitsSchema = z.object({
  amount: z.coerce.number().min(1),
  description: z.string().min(3),
});

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: usersData } = useAdminListUsers();
  // Get all folders for dropdowns (we fetch without parentId, assuming API returns all or we need a specific endpoint. Assuming listFolders gets all if no parentId)
  const { data: foldersData } = useListFolders(); 

  const updateRoleMutation = useAdminUpdateUserRole({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] })
    }
  });

  const handleRoleChange = (userId: string, newRole: "student" | "admin") => {
    updateRoleMutation.mutate({ userId, data: { role: newRole } });
  };

  return (
    <AuthWrapper requireAdmin>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" /> Admin Portal
          </h1>
          <p className="text-muted-foreground mt-2">Manage folders, resources, users, and platform settings.</p>
        </div>

        <Tabs defaultValue="resources" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mb-8 h-12">
            <TabsTrigger value="resources" className="text-base h-10">Uploads</TabsTrigger>
            <TabsTrigger value="folders" className="text-base h-10">Folders</TabsTrigger>
            <TabsTrigger value="users" className="text-base h-10">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="resources" className="space-y-6">
            <ResourceUploadTab folders={foldersData?.folders || []} />
          </TabsContent>

          <TabsContent value="folders">
            <FoldersTab folders={foldersData?.folders || []} />
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Change roles and grant units to users</CardDescription>
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
                        <th className="px-4 py-3 text-right rounded-tr-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {usersData?.users?.map(u => (
                        <tr key={u.id} className="hover:bg-muted/20">
                          <td className="px-4 py-4 font-medium text-foreground">
                            {u.firstName ? `${u.firstName} ${u.lastName}` : u.username}
                            <div className="text-xs text-muted-foreground font-normal">{u.username}</div>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {format(new Date(u.createdAt), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 py-4 font-bold text-accent">
                            {u.unitsBalance}
                          </td>
                          <td className="px-4 py-4">
                            <Select 
                              defaultValue={u.role} 
                              onValueChange={(v) => handleRoleChange(u.id, v as any)}
                            >
                              <SelectTrigger className="w-[110px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <GrantUnitsDialog userId={u.id} userName={u.username || 'User'} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthWrapper>
  );
}

// --- SUB-COMPONENTS ---

function ResourceUploadTab({ folders }: { folders: any[] }) {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createResourceMut = useCreateResource({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Resource uploaded successfully" });
        setFile(null);
        queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
        // Need to reset form manually via state or ref in a real app, keeping it simple here
      },
      onError: (err: any) => {
        toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
      }
    }
  });

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0]);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles: 1 });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return toast({ title: "Error", description: "Please select a file", variant: "destructive" });
    
    const fd = new FormData(e.currentTarget);
    createResourceMut.mutate({
      data: {
        name: fd.get("name") as string,
        description: fd.get("description") as string,
        type: fd.get("type") as string,
        folderId: fd.get("folderId") as string,
        downloadCost: Number(fd.get("downloadCost")),
        tags: fd.get("tags") as string,
        file: file
      }
    });
  };

  return (
    <Card className="border-border/60 shadow-sm max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UploadCloud className="w-5 h-5 text-primary" /> Upload New Resource</CardTitle>
        <CardDescription>Add a new document, slide deck, or video to the library.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
            {file ? (
              <div className="font-semibold text-primary">{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</div>
            ) : (
              <div>
                <p className="font-medium text-foreground">Drag & drop a file here, or click to select</p>
                <p className="text-sm text-muted-foreground mt-1">Supports PDF, PPTX, DOCX, MP4, etc.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Name *</label>
              <Input name="name" required placeholder="e.g. Intro to Computer Science" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Type *</label>
              <Select name="type" defaultValue="pdf" required>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select folder" /></SelectTrigger>
                <SelectContent>
                  {folders?.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Download Cost (Units) *</label>
              <Input name="downloadCost" type="number" defaultValue="5" required min="0" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea name="description" placeholder="Brief description of this resource..." className="resize-none h-20" />
          </div>

          <Button type="submit" disabled={createResourceMut.isPending || !file} className="w-full font-bold">
            {createResourceMut.isPending ? "Uploading..." : "Upload Resource"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FoldersTab({ folders }: { folders: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof folderSchema>>({
    resolver: zodResolver(folderSchema),
    defaultValues: { parentId: "root" }
  });

  const createFolderMut = useCreateFolder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Folder Created" });
        setIsOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      }
    }
  });

  return (
    <Card className="border-border/60 shadow-sm max-w-3xl">
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Folder Structure</CardTitle>
          <CardDescription>Organize resources hierarchically.</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><FolderPlus className="w-4 h-4" /> New Folder</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Folder</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit((d) => createFolderMut.mutate({ data: { ...d, parentId: d.parentId === 'root' ? undefined : d.parentId } }))} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input {...form.register("name")} placeholder="e.g. Year 1, Computer Science..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Parent Folder</label>
                <Select onValueChange={(v) => form.setValue("parentId", v)} defaultValue="root">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">-- Root Level --</SelectItem>
                    {folders?.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createFolderMut.isPending}>
                Create Folder
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
          {folders?.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No folders created yet.</p>
          ) : (
            <ul className="space-y-2">
              {folders?.map(f => (
                <li key={f.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border/60 shadow-sm">
                  <div className="flex items-center gap-3">
                    <FolderPlus className="w-5 h-5 text-primary/60" />
                    <span className="font-medium">{f.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{f.level === 0 ? 'Root' : `Nested`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GrantUnitsDialog({ userId, userName }: { userId: string, userName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof grantUnitsSchema>>({ resolver: zodResolver(grantUnitsSchema) });

  const mut = useAdminGrantUnits({
    mutation: {
      onSuccess: () => {
        toast({ title: "Units Granted", description: `Successfully granted to ${userName}` });
        setIsOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      }
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 border-accent/30 text-accent hover:bg-accent/10 hover:text-accent-foreground h-8 px-2 text-xs">
          <Zap className="w-3 h-3" /> Grant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant Units to {userName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((d) => mut.mutate({ userId, data: d }))} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <Input type="number" {...form.register("amount")} placeholder="e.g. 50" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Reason)</label>
            <Input {...form.register("description")} placeholder="e.g. Reward for contribution" />
          </div>
          <Button type="submit" className="w-full mt-4" disabled={mut.isPending}>
            Confirm Grant
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
