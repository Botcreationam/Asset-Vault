import { ReactNode } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthWrapperProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

export function AuthWrapper({ children, requireAdmin = false, requireModerator = false }: AuthWrapperProps) {
  const { user, isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-8 w-full max-w-3xl mx-auto mt-12">
        <Skeleton className="h-12 w-3/4 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md shadow-xl border-primary/10">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="font-serif text-2xl">Authentication Required</CardTitle>
            <CardDescription className="text-base mt-2">
              You need to be logged in to access this section of AcadVault.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground pb-6">
            Viewing and downloading academic resources is reserved for our community members.
          </CardContent>
          <CardFooter className="flex justify-center pb-8">
            <Button onClick={login} size="lg" className="px-8 font-semibold shadow-md">
              Log In to Continue
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (requireAdmin && user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md shadow-xl border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="font-serif text-2xl text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-base mt-2">
              This area is restricted to administrators.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (requireModerator && user?.role !== "admin" && user?.role !== "moderator") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md shadow-xl border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="font-serif text-2xl text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-base mt-2">
              This area is restricted to content moderators and administrators.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
