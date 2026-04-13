import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Library,
  Search,
  Shield,
  Zap,
  TrendingUp,
  Star,
  Clock,
  Eye,
  Download,
  FileStack,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkButton } from "@/components/bookmark-button";
import { getResourceIcon, formatBytes } from "@/lib/resource-utils";
import { BASE_URL } from "@/lib/api";

const BASE = import.meta.env.BASE_URL;

function useDiscovery(path: string) {
  return useQuery<{ resources: any[] }>({
    queryKey: [path],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" });
      return res.json();
    },
    staleTime: 60_000,
  });
}

function useStats() {
  return useQuery<{ totalResources: number; totalDownloads: number; totalViews: number }>({
    queryKey: ["/api/discovery/stats"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/discovery/stats`, { credentials: "include" });
      return res.json();
    },
    staleTime: 120_000,
  });
}

function ResourceCard({ resource, showRating }: { resource: any; showRating?: boolean }) {
  return (
    <div className="relative group flex-shrink-0 w-56 sm:w-64">
      <Link href={`/resource/${resource.id}`}>
        <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer bg-card group">
          <CardContent className="p-4 flex flex-col gap-3 h-full">
            <div className="flex items-start justify-between gap-2">
              <div className="p-2.5 bg-background rounded-xl border border-border/60 shadow-sm group-hover:scale-105 transition-transform">
                {getResourceIcon(resource.type, "sm")}
              </div>
              <Badge variant="secondary" className="uppercase text-[10px] font-semibold shrink-0">
                {resource.type}
              </Badge>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                {resource.name}
              </h3>
              {resource.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{resource.description}</p>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {showRating && resource.avgRating ? (
                <div className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Star className="w-3 h-3 fill-amber-500" />
                  <span>{resource.avgRating}</span>
                  <span className="text-muted-foreground font-normal">({resource.ratingCount})</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {resource.viewCount ?? 0}</span>
                  <span className="flex items-center gap-0.5"><Download className="w-3 h-3" /> {resource.downloadCount ?? 0}</span>
                </div>
              )}
              <div className="flex items-center gap-0.5 text-accent font-bold">
                <Zap className="w-3 h-3" /> {resource.downloadCost}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <BookmarkButton resourceId={resource.id} size="sm" />
      </div>
    </div>
  );
}

function ResourceRow({
  title,
  icon: Icon,
  iconColor,
  data,
  isLoading,
  showRating,
  viewAllHref,
}: {
  title: string;
  icon: any;
  iconColor: string;
  data: any[] | undefined;
  isLoading: boolean;
  showRating?: boolean;
  viewAllHref?: string;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${iconColor} bg-opacity-10`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          {title}
        </h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-56 sm:w-64 flex-shrink-0 rounded-xl" />
            ))
          : (data ?? []).length === 0
            ? (
              <div className="text-muted-foreground text-sm py-6 px-4">No resources yet — check back soon.</div>
            )
            : (data ?? []).map((r: any) => (
                <ResourceCard key={r.id} resource={r} showRating={showRating} />
              ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { isAuthenticated, login, user } = useAuth();
  const { data: stats, isLoading: loadingStats } = useStats();
  const { data: trending, isLoading: loadingTrending } = useDiscovery("api/discovery/trending");
  const { data: topRated, isLoading: loadingTopRated } = useDiscovery("api/discovery/top-rated");
  const { data: recent, isLoading: loadingRecent } = useDiscovery("api/discovery/recent");
  const { data: forYou, isLoading: loadingForYou } = useDiscovery("api/discovery/for-you");

  return (
    <div className="flex flex-col gap-10 pb-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden shadow-2xl bg-[#142042] text-white min-h-[420px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img
            src={`${BASE}images/hero-bg.png`}
            alt="Library background"
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#142042]/95 to-[#142042]/50" />
        </div>

        <div className="relative z-10 px-8 md:px-16 py-12 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 text-sm font-medium text-white/90 backdrop-blur-sm">
              The Premier Academic Vault
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-6 text-white">
              Unlock the Knowledge You Need to Succeed.
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-2xl leading-relaxed">
              AcadVault provides secure access to verified academic resources. Read online for free, or use your units to download materials for offline study.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 font-bold px-8 h-12 shadow-lg">
                <Link href="/browse">
                  Browse Library <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              {!isAuthenticated && (
                <>
                  <Button size="lg" variant="outline" onClick={login} className="border-white/30 text-white hover:bg-white/10 font-semibold px-8 h-12 backdrop-blur-sm">
                    Log in
                  </Button>
                  <Button size="lg" onClick={login} className="bg-[var(--color-accent)] text-[var(--color-bg-dark)] hover:bg-[var(--color-accent)]/90 font-bold px-8 h-12 shadow-lg">
                    Sign up
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Search */}
      <section className="-mt-12 relative z-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto bg-card rounded-2xl shadow-xl border border-border p-3 flex items-center gap-2"
        >
          <div className="bg-secondary/30 p-3 rounded-xl ml-1">
            <Search className="w-6 h-6 text-primary" />
          </div>
          <form
            className="flex-1 flex"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              if (q) window.location.href = `${BASE}search?q=${q}`;
            }}
          >
            <input
              name="q"
              type="text"
              placeholder="Search for courses, subjects, or specific documents..."
              className="flex-1 bg-transparent border-none outline-none px-4 text-lg font-medium placeholder:text-muted-foreground focus:ring-0"
            />
            <Button type="submit" size="lg" className="rounded-xl px-8 font-semibold hidden sm:flex">
              Search
            </Button>
          </form>
        </motion.div>
      </section>

      {/* Platform Stats */}
      <section>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Resources", value: stats?.totalResources ?? "—", icon: FileStack, color: "text-blue-500" },
            { label: "Total Views", value: stats?.totalViews ?? "—", icon: Eye, color: "text-green-500" },
            { label: "Downloads", value: stats?.totalDownloads ?? "—", icon: Download, color: "text-amber-500" },
          ].map((s) => (
            <Card key={s.label} className="border border-border/50">
              <CardContent className="py-4 px-5 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-secondary/40`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground">
                    {loadingStats ? <Skeleton className="h-6 w-12" /> : Number(s.value).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* For You row — only shown when user has academic profile */}
      {isAuthenticated && user?.onboardingCompleted && user?.program && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">Personalised for you</span>
          </div>
          <ResourceRow
            title={`${user.program} · Year ${user.academicYear} · Sem ${user.semester}`}
            icon={Sparkles}
            iconColor="text-accent"
            data={forYou?.resources}
            isLoading={loadingForYou}
            viewAllHref="/browse"
          />
        </div>
      )}

      {/* Discovery Rows */}
      <ResourceRow
        title="Trending This Week"
        icon={TrendingUp}
        iconColor="text-rose-500"
        data={trending?.resources}
        isLoading={loadingTrending}
        viewAllHref="/browse"
      />

      <ResourceRow
        title="Top Rated"
        icon={Star}
        iconColor="text-amber-500"
        data={topRated?.resources}
        isLoading={loadingTopRated}
        showRating
        viewAllHref="/browse"
      />

      <ResourceRow
        title="Recently Added"
        icon={Clock}
        iconColor="text-sky-500"
        data={recent?.resources}
        isLoading={loadingRecent}
        viewAllHref="/browse"
      />

      {/* How it works */}
      <section className="pt-4">
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-3">How AcadVault Works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">A fair system giving you the best access to academic materials.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "Extensive Library", desc: "Browse thousands of resources organized by program and subject.", icon: Library, color: "text-blue-500", bg: "bg-blue-500/10" },
            { title: "Read for Free", desc: "View any document directly in your browser at no cost.", icon: BookOpen, color: "text-green-500", bg: "bg-green-500/10" },
            { title: "Download with Units", desc: "Download for offline access using our fair unit-based system.", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
            { title: "Secure & Verified", desc: "All content is uploaded by administrators for academic integrity.", icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10" },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 * i }}>
              <Card className="h-full border border-border/50 hover:border-primary/20 hover:shadow-lg hover:-translate-y-1 transition-all bg-card group">
                <CardHeader className="pb-2">
                  <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-6 h-6 ${f.color}`} />
                  </div>
                  <CardTitle className="font-serif text-base leading-snug">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {!isAuthenticated && (
        <section className="bg-secondary/30 rounded-3xl p-8 md:p-12 text-center border border-secondary/50">
          <h2 className="font-serif text-3xl font-bold text-foreground mb-4">Ready to start studying?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
            Join thousands of students accessing premium academic resources today.
          </p>
          <Button size="lg" onClick={login} className="font-bold px-10 h-14 rounded-xl text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
            Sign up or log in
          </Button>
        </section>
      )}
    </div>
  );
}
