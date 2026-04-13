import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { ClerkProvider, useClerk } from "@clerk/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
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
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function ClerkAuthSync() {
  const { session } = useClerk();
  const qc = useQueryClient();
  const prevSessionIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (session) {
      setAuthTokenGetter(() => session.getToken());
    } else {
      setAuthTokenGetter(null);
    }

    const currentId = session?.id ?? null;
    if (prevSessionIdRef.current !== undefined && prevSessionIdRef.current !== currentId) {
      qc.clear();
    }
    prevSessionIdRef.current = currentId;
  }, [session, qc]);

  return null;
}

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
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkAuthSync />
        <TooltipProvider>
          <Router />
        </TooltipProvider>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
