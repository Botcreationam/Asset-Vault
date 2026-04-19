import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAuthModalTrigger } from "@workspace/replit-auth-web";
import { useAuth } from "@workspace/replit-auth-web";

export function AuthModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Sign-in state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  // Sign-up state
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpFirstName, setSignUpFirstName] = useState("");
  const [signUpLastName, setSignUpLastName] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const [signUpLoading, setSignUpLoading] = useState(false);

  const { refetch } = useAuth();

  const handleOpen = useCallback(() => {
    setOpen(true);
    setSignInError("");
    setSignUpError("");
  }, []);

  useAuthModalTrigger(handleOpen);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInError("");
    setSignInLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: signInEmail, password: signInPassword }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setSignInError(data.error ?? "Sign in failed. Please try again.");
        return;
      }
      await refetch();
      setOpen(false);
    } catch {
      setSignInError("Network error. Please try again.");
    } finally {
      setSignInLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSignUpError("");
    setSignUpLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: signUpEmail,
          password: signUpPassword,
          firstName: signUpFirstName || undefined,
          lastName: signUpLastName || undefined,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string; requiresLogin?: boolean };
      if (!res.ok) {
        setSignUpError(data.error ?? "Sign up failed. Please try again.");
        return;
      }
      if (data.requiresLogin) {
        setTab("signin");
        setSignInEmail(signUpEmail);
        setSignUpError("");
        return;
      }
      await refetch();
      setOpen(false);
    } catch {
      setSignUpError("Network error. Please try again.");
    } finally {
      setSignUpLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">Welcome to AcadVault</DialogTitle>
          <DialogDescription className="text-center">
            Access thousands of academic resources shared by students like you.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {signInError && (
                <p className="text-sm text-destructive">{signInError}</p>
              )}
              <Button type="submit" className="w-full font-semibold" disabled={signInLoading}>
                {signInLoading ? "Signing in…" : "Sign In"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-2 hover:underline"
                  onClick={() => setTab("signup")}
                >
                  Create one
                </button>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="signup-first">First Name</Label>
                  <Input
                    id="signup-first"
                    placeholder="Alice"
                    value={signUpFirstName}
                    onChange={(e) => setSignUpFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-last">Last Name</Label>
                  <Input
                    id="signup-last"
                    placeholder="Banda"
                    value={signUpLastName}
                    onChange={(e) => setSignUpLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              {signUpError && (
                <p className="text-sm text-destructive">{signUpError}</p>
              )}
              <Button type="submit" className="w-full font-semibold" disabled={signUpLoading}>
                {signUpLoading ? "Creating account…" : "Create Account"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-2 hover:underline"
                  onClick={() => setTab("signin")}
                >
                  Sign in
                </button>
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
