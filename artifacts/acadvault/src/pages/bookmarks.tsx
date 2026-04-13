import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AuthWrapper } from "@/components/auth-wrapper";
import { BookmarkButton } from "@/components/bookmark-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Bookmark, ChevronRight, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BASE_URL } from "@/lib/api";
import { getResourceIcon, formatBytes } from "@/lib/resource-utils";

export default function Bookmarks() {
  return (
    <AuthWrapper>
      <BookmarksContent />
    </AuthWrapper>
  );
}

function BookmarksContent() {
  const { data, isLoading } = useQuery<{ bookmarks: any[] }>({
    queryKey: ["/api/bookmarks"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/bookmarks`, { credentials: "include" });
      return res.json();
    },
  });

  const bookmarks = data?.bookmarks ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
          <Bookmark className="w-8 h-8 text-primary fill-primary" /> Saved Resources
        </h1>
        <p className="text-muted-foreground mt-2">Resources you've bookmarked for quick access.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="p-16 text-center bg-card border border-dashed border-border rounded-2xl flex flex-col items-center gap-4">
          <div className="bg-muted p-5 rounded-full">
            <Bookmark className="w-10 h-10 text-muted-foreground opacity-40" />
          </div>
          <div>
            <h3 className="font-semibold text-xl">No saved resources yet</h3>
            <p className="text-muted-foreground mt-1">
              Click the bookmark icon on any resource to save it here.
            </p>
          </div>
          <Link href="/browse" className="text-primary font-medium hover:underline mt-2">
            Browse the library →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookmarks.map((resource: any) => (
            <div key={resource.id} className="relative group">
              <Link href={`/resource/${resource.id}`}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group bg-card">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="shrink-0 p-2 bg-background rounded-lg border border-border/50 shadow-sm group-hover:scale-110 transition-transform">
                      {getResourceIcon(resource.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-base truncate group-hover:text-primary transition-colors">
                          {resource.name}
                        </h3>
                        <Badge variant="secondary" className="uppercase text-[10px] hidden sm:inline-flex">
                          {resource.type}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatBytes(resource.fileSize)}</span>
                        <span>·</span>
                        <span>Saved {formatDistanceToNow(new Date(resource.bookmarkedAt), { addSuffix: true })}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1 text-accent font-bold text-sm">
                        <Zap className="w-3.5 h-3.5" /> {resource.downloadCost}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-secondary/30 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-primary">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <div className="absolute top-1/2 -translate-y-1/2 right-14">
                <BookmarkButton resourceId={resource.id} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
