import { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  resourceId: string;
  size?: "sm" | "md" | "default";
  className?: string;
}

export function BookmarkButton({ resourceId, size = "md", className }: BookmarkButtonProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const { data } = useQuery<{ bookmarked: boolean }>({
    queryKey: ["/api/bookmarks/check", resourceId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/bookmarks/check/${resourceId}`, { credentials: "include" });
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE_URL}api/bookmarks/${resourceId}`, {
        method: "POST",
        credentials: "include",
      });
      return res.json() as Promise<{ bookmarked: boolean }>;
    },
    onMutate: () => {
      const current = optimistic ?? data?.bookmarked ?? false;
      setOptimistic(!current);
    },
    onSuccess: (result) => {
      setOptimistic(result.bookmarked);
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      queryClient.setQueryData(["/api/bookmarks/check", resourceId], { bookmarked: result.bookmarked });
    },
    onError: () => {
      setOptimistic(null);
    },
  });

  if (!isAuthenticated) return null;

  const isBookmarked = optimistic ?? data?.bookmarked ?? false;

  if (size === "default") {
    return (
      <Button
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          mutation.mutate();
        }}
        className={cn(
          "gap-2",
          isBookmarked
            ? "border-primary/50 text-primary bg-primary/5 hover:bg-primary/10"
            : "text-muted-foreground hover:text-primary",
          className,
        )}
      >
        <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
        {isBookmarked ? "Saved" : "Save Resource"}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mutation.mutate();
      }}
      className={cn(
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
        isBookmarked
          ? "text-primary hover:text-primary/70"
          : "text-muted-foreground hover:text-primary",
        className,
      )}
      title={isBookmarked ? "Remove bookmark" : "Save bookmark"}
    >
      <Bookmark className={cn(size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4", isBookmarked && "fill-current")} />
    </Button>
  );
}
