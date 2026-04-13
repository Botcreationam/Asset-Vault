import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BASE_URL } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Star, MessageSquare, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface Rating {
  id: number;
  rating: number;
  review: string | null;
  createdAt: string;
  userId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface RatingsData {
  ratings: Rating[];
  average: number;
  count: number;
  userRating: Rating | null;
}

function StarRow({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-7 h-7" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className={readOnly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"}
          aria-label={`Rate ${star} stars`}
        >
          <Star
            className={`${sz} transition-colors ${
              (hovered || value) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function ResourceRatings({ resourceId }: { resourceId: string }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchRatings = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}api/resources/${resourceId}/ratings`, {
        credentials: "include",
      });
      const d = await res.json();
      setData(d);
      if (d.userRating) {
        setMyRating(d.userRating.rating);
        setMyReview(d.userRating.review || "");
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myRating) {
      toast({ title: "Please select a star rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}api/resources/${resourceId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating: myRating, review: myReview }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Rating submitted!" });
      setShowForm(false);
      fetchRatings();
    } catch {
      toast({ title: "Failed to submit rating", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`${BASE_URL}api/resources/${resourceId}/ratings`, {
        method: "DELETE",
        credentials: "include",
      });
      setMyRating(0);
      setMyReview("");
      setShowForm(false);
      toast({ title: "Rating removed" });
      fetchRatings();
    } catch {
      toast({ title: "Failed to remove rating", variant: "destructive" });
    }
  };

  if (loading) return null;

  const average = data?.average ?? 0;
  const ratingCount = data?.count ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mt-5">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-semibold">Ratings & Reviews</span>
          <span className="text-xs text-muted-foreground">({ratingCount})</span>
        </div>
        {average > 0 && (
          <div className="flex items-center gap-2">
            <StarRow value={Math.round(average)} readOnly size="sm" />
            <span className="text-sm font-bold">{average.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {average > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">{average.toFixed(1)}</div>
              <StarRow value={Math.round(average)} readOnly size="sm" />
              <div className="text-xs text-muted-foreground mt-1">{ratingCount} {ratingCount === 1 ? "review" : "reviews"}</div>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const c = data?.ratings.filter((r) => r.rating === star).length ?? 0;
                const pct = ratingCount > 0 ? (c / ratingCount) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-right text-muted-foreground">{star}</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-yellow-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-muted-foreground">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isAuthenticated && (
          <div className="border border-border rounded-xl p-4 bg-muted/20">
            {!showForm && !data?.userRating ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Rate this resource:</span>
                <StarRow
                  value={myRating}
                  onChange={(v) => {
                    setMyRating(v);
                    setShowForm(true);
                  }}
                  size="md"
                />
              </div>
            ) : data?.userRating && !showForm ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-foreground">Your rating:</span>
                <StarRow value={data.userRating.rating} readOnly size="md" />
                {data.userRating.review && (
                  <span className="text-sm text-muted-foreground italic">"{data.userRating.review}"</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs ml-auto"
                  onClick={() => setShowForm(true)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : null}

            {showForm && (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Your rating:</span>
                  <StarRow value={myRating} onChange={setMyRating} size="md" />
                </div>
                <Textarea
                  placeholder="Write a review (optional)..."
                  value={myReview}
                  onChange={(e) => setMyReview(e.target.value)}
                  className="resize-none h-20 text-sm"
                  maxLength={500}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={submitting} className="font-semibold">
                    {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Saving…</> : "Submit Review"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      if (data?.userRating) {
                        setMyRating(data.userRating.rating);
                        setMyReview(data.userRating.review || "");
                      } else {
                        setMyRating(0);
                        setMyReview("");
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {!isAuthenticated && ratingCount === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Log in to rate this resource.
          </p>
        )}

        {data?.ratings && data.ratings.length > 0 && (
          <div className="space-y-3">
            {data.ratings.map((r) => {
              const name = r.firstName ? `${r.firstName} ${r.lastName}` : r.username || "Student";
              const initials = name.charAt(0).toUpperCase();
              return (
                <div key={r.id} className="flex gap-3">
                  <Avatar className="w-8 h-8 shrink-0 border border-border">
                    <AvatarImage src={r.profileImageUrl ?? undefined} />
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{name}</span>
                      <StarRow value={r.rating} readOnly size="sm" />
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(r.createdAt))} ago
                      </span>
                    </div>
                    {r.review && (
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{r.review}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
