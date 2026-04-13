import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useNotifications } from "@/hooks/use-notifications";
import { 
  BookOpen, 
  Compass, 
  FolderSearch, 
  LogOut, 
  ShieldCheck, 
  UserCircle, 
  Zap,
  Search,
  Sun,
  Moon,
  Newspaper,
  MessageSquare,
  Bell,
  PackageSearch,
  CheckCheck,
  Shield,
} from "lucide-react";

import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const TYPE_ICONS: Record<string, string> = {
  units_received: "💰",
  request_fulfilled: "📦",
  new_resource: "📚",
  resource_approved: "✅",
  system: "🔔",
};

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, toggleTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAllRead, markRead } = useNotifications(isAuthenticated);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navItems = [
    { title: "Home", url: "/", icon: Compass },
    { title: "Browse Library", url: "/browse", icon: BookOpen },
    { title: "Advanced Search", url: "/search", icon: FolderSearch },
  ];

  const socialItems = [
    { title: "News Feed", url: "/feed", icon: Newspaper },
    { title: "Messages", url: "/chat", icon: MessageSquare },
    { title: "Request Material", url: "/material-requests", icon: PackageSearch },
  ];

  const userItems = [
    { title: "My Account", url: "/account", icon: UserCircle },
  ];

  if (user?.role === "admin") {
    userItems.push({ title: "Admin Portal", url: "/admin", icon: ShieldCheck });
  }
  if (user?.role === "moderator") {
    userItems.push({ title: "Moderator Portal", url: "/moderator", icon: Shield });
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar variant="sidebar" className="border-r border-sidebar-border shadow-sm">
          <SidebarHeader className="p-4">
            <Link href="/" className="flex items-center gap-2 px-2 py-1">
              <img src="/logo.png" alt="AcadVault" className="w-8 h-8 rounded-lg shadow-sm" />
              <span className="font-serif font-bold text-xl tracking-tight text-sidebar-foreground">
                AcadVault
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold tracking-wider uppercase text-sidebar-foreground/50">
                Discover
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={location === item.url || (item.url === '/browse' && location.startsWith('/browse'))}>
                        <Link href={item.url} className="flex items-center gap-3 transition-colors">
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAuthenticated && (
              <SidebarGroup className="mt-4">
                <SidebarGroupLabel className="text-xs font-semibold tracking-wider uppercase text-sidebar-foreground/50">
                  Community
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {socialItems.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={location.startsWith(item.url)}>
                          <Link href={item.url} className="flex items-center gap-3 transition-colors">
                            <item.icon className="w-4 h-4" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {isAuthenticated && (
              <SidebarGroup className="mt-4">
                <SidebarGroupLabel className="text-xs font-semibold tracking-wider uppercase text-sidebar-foreground/50">
                  Personal
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {userItems.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={location.startsWith(item.url)}>
                          <Link href={item.url} className="flex items-center gap-3 transition-colors">
                            <item.icon className="w-4 h-4" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-sidebar-border">
            {isAuthenticated ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-2 rounded-xl bg-sidebar-accent/50 border border-sidebar-border">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent" />
                    <span className="text-sm font-semibold text-sidebar-foreground">{user?.unitsBalance || 0} Units</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-sidebar-accent" asChild>
                    <Link href="/account">
                      <span className="sr-only">Get Units</span>
                      +
                    </Link>
                  </Button>
                </div>
                
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Avatar className="w-9 h-9 border border-sidebar-border shadow-sm">
                      <AvatarImage src={user?.profileImageUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium text-sidebar-foreground truncate">
                        {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
                      </span>
                      <span className="text-xs text-sidebar-foreground/60 capitalize">
                        {user?.role}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={logout} className="shrink-0 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-sidebar-foreground/70 mb-2 px-1">
                  Log in to access your resources and unit balance.
                </p>
                <Button onClick={login} className="w-full font-semibold shadow-md">
                  Log In
                </Button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0 bg-background/50">
          <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="md:hidden" />
              
              <form onSubmit={handleSearch} className="relative w-full max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search resources, books, notes..." 
                  className="pl-9 bg-card border-border shadow-sm focus-visible:ring-primary rounded-full h-10 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
                aria-label="Toggle dark mode"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              {isAuthenticated && (
                <div ref={notifRef} className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label="Notifications"
                    onClick={() => {
                      setNotifOpen((o) => !o);
                    }}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>

                  {notifOpen && (
                    <div className="absolute right-0 top-11 w-80 rounded-xl border border-border bg-background shadow-xl z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                        <span className="font-semibold text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={markAllRead}
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                          </Button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto divide-y divide-border/50">
                        {notifications.length === 0 ? (
                          <div className="py-10 text-center text-sm text-muted-foreground">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              className={`w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex gap-3 ${!n.isRead ? "bg-primary/5" : ""}`}
                              onClick={() => {
                                if (!n.isRead) markRead(n.id);
                              }}
                            >
                              <span className="text-lg shrink-0 mt-0.5">{TYPE_ICONS[n.type] || "🔔"}</span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                                  {!n.isRead && (
                                    <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-1">
                                  {formatDistanceToNow(new Date(n.createdAt))} ago
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isAuthenticated && (
                <Link href="/account">
                  <Badge variant="secondary" className="px-3 py-1.5 flex items-center gap-1.5 cursor-pointer hover:bg-secondary/80 transition-colors shadow-sm text-sm">
                    <Zap className="w-3.5 h-3.5 text-accent-foreground" />
                    <span className="font-bold">{user?.unitsBalance || 0}</span>
                    <span className="hidden sm:inline text-secondary-foreground/70 font-medium">Units</span>
                  </Badge>
                </Link>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl w-full">
              {children}
            </div>
          </main>
        </div>
      </div>

      <a
        href="https://wa.me/260978277538?text=Hi%2C%20I%20need%20help%20with%20AcadVault"
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with us on WhatsApp"
        title="Need help? Chat with us on WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/40 px-4 py-3 group"
      >
        <WhatsAppIcon />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-xs">
          Need help?
        </span>
      </a>
    </SidebarProvider>
  );
}
