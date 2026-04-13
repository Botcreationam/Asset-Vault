import { useState, useEffect, useCallback } from "react";
import { AuthWrapper } from "@/components/auth-wrapper";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PackageSearch, Plus, Loader2, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200", icon: RefreshCw },
  fulfilled: { label: "Fulfilled", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

export default function MaterialRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adminStatusMap, setAdminStatusMap] = useState<Record<number, string>>({});
  const [adminNoteMap, setAdminNoteMap] = useState<Record<number, string>>({});

  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "",
    courseCode: "",
  });

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}api/material-requests`, { credentials: "include" });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      toast({ title: "Failed to load requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}api/material-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Request submitted!", description: "Admins will review your request." });
      setOpen(false);
      setForm({ title: "", description: "", subject: "", courseCode: "" });
      fetchRequests();
    } catch {
      toast({ title: "Failed to submit request", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminUpdate = async (id: number) => {
    const status = adminStatusMap[id];
    if (!status) return;
    try {
      const res = await fetch(`${BASE_URL}api/material-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, adminNote: adminNoteMap[id] || "" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Request updated" });
      fetchRequests();
    } catch {
      toast({ title: "Failed to update request", variant: "destructive" });
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthWrapper>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
              <PackageSearch className="w-8 h-8 text-primary" />
              Material Requests
            </h1>
            <p className="text-muted-foreground mt-2">
              {isAdmin
                ? "Manage student material requests below."
                : "Can't find what you need? Request a resource and our admins will try to add it."}
            </p>
          </div>
          {!isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="shrink-0 font-semibold gap-2">
                  <Plus className="w-4 h-4" /> New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Request a Resource</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Resource Title *</label>
                    <Input
                      required
                      placeholder="e.g. Engineering Mathematics Textbook"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subject</label>
                      <Input
                        placeholder="e.g. Mathematics"
                        value={form.subject}
                        onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Course Code</label>
                      <Input
                        placeholder="e.g. MATH 201"
                        value={form.courseCode}
                        onChange={(e) => setForm((f) => ({ ...f, courseCode: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Any additional details (author, edition, topics covered…)"
                      className="resize-none h-24"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={submitting} className="font-semibold w-full">
                      {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</> : "Submit Request"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="flex flex-col items-center py-16 text-center gap-4">
              <PackageSearch className="w-16 h-16 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">
                {isAdmin ? "No material requests yet." : "You haven't made any requests yet."}
              </p>
              {!isAdmin && (
                <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Make your first request
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.icon;
              return (
                <Card key={req.id} className="border-border/60 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-foreground">{req.title}</h3>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>
                        {isAdmin && (req.firstName || req.username) && (
                          <p className="text-xs text-muted-foreground mb-1">
                            From: {req.firstName ? `${req.firstName} ${req.lastName}` : req.username}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          {req.subject && <span>Subject: <strong>{req.subject}</strong></span>}
                          {req.courseCode && <span>Course: <strong>{req.courseCode}</strong></span>}
                          <span>{format(new Date(req.createdAt), "MMM d, yyyy")}</span>
                        </div>
                        {req.description && (
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{req.description}</p>
                        )}
                        {req.adminNote && (
                          <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border text-xs">
                            <span className="font-medium text-foreground">Admin note: </span>
                            <span className="text-muted-foreground">{req.adminNote}</span>
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <Select
                            value={adminStatusMap[req.id] || req.status}
                            onValueChange={(v) =>
                              setAdminStatusMap((m) => ({ ...m, [req.id]: v }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="fulfilled">Fulfilled</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Admin note…"
                            className="h-8 text-xs"
                            value={adminNoteMap[req.id] ?? req.adminNote ?? ""}
                            onChange={(e) =>
                              setAdminNoteMap((m) => ({ ...m, [req.id]: e.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            className="h-8 text-xs font-semibold"
                            onClick={() => handleAdminUpdate(req.id)}
                          >
                            Update
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AuthWrapper>
  );
}
