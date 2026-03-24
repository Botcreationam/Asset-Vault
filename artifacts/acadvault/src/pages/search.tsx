import { useSearch } from "wouter";
import { useListResources } from "@workspace/api-client-react";
import { AuthWrapper } from "@/components/auth-wrapper";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, FileText, ChevronRight, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchResults() {
  const searchString = useSearch();
  const urlQuery = new URLSearchParams(searchString).get('q') || '';

  const [query, setQuery] = useState(urlQuery);
  const [activeSearch, setActiveSearch] = useState(urlQuery);

  // Sync state whenever the URL query param changes (e.g. searching from header bar)
  useEffect(() => {
    setQuery(urlQuery);
    setActiveSearch(urlQuery);
  }, [urlQuery]);

  const { data, isLoading } = useListResources(
    { search: activeSearch },
    { query: { enabled: activeSearch.length > 0 } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setActiveSearch(query.trim());
    }
  };

  return (
    <AuthWrapper>
      <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-12">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-4">Search Resources</h1>
          
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, description, or tags..." 
                className="pl-10 h-12 text-lg rounded-xl shadow-sm border-border/80 focus-visible:ring-primary"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 rounded-xl px-8 font-semibold">
              Search
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          {activeSearch && (
            <h2 className="text-sm font-medium text-muted-foreground">
              Results for "<span className="text-foreground">{activeSearch}</span>"
            </h2>
          )}

          {!activeSearch ? (
            <div className="p-12 text-center text-muted-foreground border border-border border-dashed rounded-xl bg-card/50">
              <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Enter a search term above to find resources.</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : data?.resources?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground border border-border border-dashed rounded-xl bg-card/50">
              <p className="text-lg font-medium text-foreground">No results found</p>
              <p className="mt-1">Try adjusting your search terms or browsing the folders.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {data?.resources?.map((resource) => (
                <Link key={resource.id} href={`/resource/${resource.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group bg-card hover:bg-card/90">
                    <CardContent className="p-5 flex items-center gap-4 sm:gap-6">
                      <div className="shrink-0 p-3 bg-primary/10 text-primary rounded-xl">
                        <FileText className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-lg truncate group-hover:text-primary transition-colors">
                            {resource.name}
                          </h3>
                          <Badge variant="outline" className="uppercase text-[10px]">{resource.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {resource.description || "No description"}
                        </p>
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
      </div>
    </AuthWrapper>
  );
}
