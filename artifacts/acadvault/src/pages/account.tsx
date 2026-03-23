import { useAuth } from "@workspace/replit-auth-web";
import { useGetUnitsBalance, useGetUnitsTransactions } from "@workspace/api-client-react";
import { AuthWrapper } from "@/components/auth-wrapper";
import { format } from "date-fns";
import { 
  Zap, 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet,
  User as UserIcon,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Account() {
  const { user } = useAuth();
  const { data: balanceData, isLoading: isLoadingBalance } = useGetUnitsBalance();
  const { data: historyData, isLoading: isLoadingHistory } = useGetUnitsTransactions();

  return (
    <AuthWrapper>
      <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-12">
        <h1 className="font-serif text-3xl font-bold text-foreground">My Account</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="md:col-span-1 bg-card shadow-md border-border/60">
            <CardHeader className="text-center pb-2">
              <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-background shadow-lg">
                <AvatarImage src={user?.profileImageUrl} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl font-serif">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
              </CardTitle>
              <div className="flex justify-center mt-2">
                <Badge variant="outline" className="uppercase tracking-wider text-xs bg-secondary/10">
                  {user?.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <UserIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{user?.username}</span>
                </div>
                {/* Real app would have email, joined date etc */}
              </div>
            </CardContent>
          </Card>

          {/* Balance Card */}
          <Card className="md:col-span-2 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-xl border-none relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/3 -translate-y-1/4">
              <Zap className="w-64 h-64" />
            </div>
            <CardHeader>
              <CardTitle className="text-primary-foreground/80 flex items-center gap-2 text-lg font-normal">
                <Wallet className="w-5 h-5" /> Available Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <Skeleton className="h-16 w-32 bg-primary-foreground/20 rounded-xl" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold tracking-tight">{balanceData?.balance || 0}</span>
                  <span className="text-xl text-primary-foreground/80 font-medium">units</span>
                </div>
              )}
              <p className="mt-6 text-primary-foreground/70 max-w-md text-sm leading-relaxed">
                Units are used to download premium academic resources. You can read materials online for free.
                If you need more units, contact an administrator.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="bg-card shadow-md border-border/60">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <History className="w-5 h-5 text-primary" /> Transaction History
            </CardTitle>
            <CardDescription>Recent changes to your unit balance</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingHistory ? (
              <div className="p-6 flex flex-col gap-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : historyData?.transactions?.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <CreditCard className="w-12 h-12 mb-4 opacity-20" />
                <p>No transactions found.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {historyData?.transactions?.map((tx) => (
                  <div key={tx.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-start sm:items-center gap-4">
                      <div className={`p-2.5 rounded-full shrink-0 ${tx.type === 'credit' ? 'bg-green-500/10 text-green-600' : 'bg-rose-500/10 text-rose-600'}`}>
                        {tx.type === 'credit' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm sm:text-base">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{format(new Date(tx.createdAt), "MMM d, yyyy • h:mm a")}</span>
                          {tx.resourceName && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[150px] sm:max-w-xs block">{tx.resourceName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold text-lg shrink-0 ${tx.type === 'credit' ? 'text-green-600' : 'text-foreground'}`}>
                      {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthWrapper>
  );
}
