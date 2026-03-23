import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { 
  BookOpen, 
  Compass, 
  FolderSearch, 
  LogOut, 
  ShieldCheck, 
  UserCircle, 
  Zap,
  Search,
  Menu
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

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

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

  const userItems = [
    { title: "My Account", url: "/account", icon: UserCircle },
  ];

  if (user?.role === "admin") {
    userItems.push({ title: "Admin Portal", url: "/admin", icon: ShieldCheck });
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar variant="sidebar" className="border-r border-sidebar-border shadow-sm">
          <SidebarHeader className="p-4">
            <Link href="/" className="flex items-center gap-2 px-2 py-1">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
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

        {/* Main Content Area */}
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

            <div className="flex items-center gap-4">
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
    </SidebarProvider>
  );
}
