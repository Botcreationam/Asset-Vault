import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
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
import Onboarding from "@/pages/onboarding";
import PendingApproval from "@/pages/pending-approval";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  },
});

function OnboardingGuard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Not yet onboarded → go to onboarding
      if (!user.onboardingCompleted && location !== "/onboarding") {
        setLocation("/onboarding");
        return;
      }
      // Onboarded but pending/rejected → go to pending-approval screen
      if (
        user.onboardingCompleted &&
        (user.approvalStatus === "pending" || user.approvalStatus === "rejected") &&
        user.role !== "admin" &&
        location !== "/pending-approval"
      ) {
        setLocation("/pending-approval");
      }
    }
  }, [isLoading, isAuthenticated, user, location]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/pending-approval" component={PendingApproval} />
      <Route>
        <AppLayout>
          <OnboardingGuard />
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
      </Route>
    </Switch>
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
