import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AppLayout } from "@/components/layout/app-layout";

import Home from "@/pages/home";
import Browse from "@/pages/browse";
import ResourceDetail from "@/pages/resource-detail";
import Account from "@/pages/account";
import Admin from "@/pages/admin";
import Search from "@/pages/search";
import Feed from "@/pages/feed";
import Chat from "@/pages/chat";
import MaterialRequests from "@/pages/material-requests";
import Moderator from "@/pages/moderator";
import Bookmarks from "@/pages/bookmarks";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/browse/:folderId?" component={Browse} />
        <Route path="/resource/:resourceId" component={ResourceDetail} />
        <Route path="/search" component={Search} />
        <Route path="/feed" component={Feed} />
        <Route path="/chat" component={Chat} />
        <Route path="/account" component={Account} />
        <Route path="/admin" component={Admin} />
        <Route path="/material-requests" component={MaterialRequests} />
        <Route path="/moderator" component={Moderator} />
        <Route path="/bookmarks" component={Bookmarks} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
