import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useListConversations,
  useCreateConversation,
  useListMessages,
  useSendMessage,
  useListChatUsers,
} from "@workspace/api-client-react";
import { AuthWrapper } from "@/components/auth-wrapper";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Send,
  Plus,
  ArrowLeft,
  Search,
  Users,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function NewChatDialog({ onSelect }: { onSelect: (userId: string) => void }) {
  const { data, isLoading } = useListChatUsers();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = data?.users?.filter((u) => {
    const name = `${u.firstName || ""} ${u.lastName || ""} ${u.username || ""}`.toLowerCase();
    return name.includes(search.toLowerCase());
  }) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Start a Conversation</DialogTitle>
        </DialogHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { onSelect(u.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={u.profileImageUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {u.firstName?.charAt(0) || u.username?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.username || "User"}
                    </p>
                    {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function MessageView({ conversationId, participant, onBack }: {
  conversationId: number;
  participant: any;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();
  const { data, isLoading } = useListMessages(conversationId, { limit: 50 });
  const sendMessage = useSendMessage();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === "new_message" && msg.data?.conversationId === conversationId) {
        queryClient.invalidateQueries({ queryKey: [`/api/chat/conversations/${conversationId}/messages`] });
      }
    });
    return unsub;
  }, [subscribe, queryClient, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    try {
      await sendMessage.mutateAsync({ conversationId, data: { content } });
      queryClient.invalidateQueries({ queryKey: [`/api/chat/conversations/${conversationId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
    } catch {}
  };

  const participantName = participant?.firstName
    ? `${participant.firstName} ${participant.lastName || ""}`.trim()
    : participant?.username || "User";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 border-b border-border/50 bg-card">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-9 h-9">
          <AvatarImage src={participant?.profileImageUrl} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {participant?.firstName?.charAt(0) || participant?.username?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold text-sm">{participantName}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-2/3" />)}
          </div>
        ) : data?.messages?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          data?.messages?.map((msg) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border/50 bg-card">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          />
          <Button onClick={handleSend} disabled={!text.trim() || sendMessage.isPending} size="icon">
            {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();
  const { data, isLoading } = useListConversations();
  const createConversation = useCreateConversation();
  const [selectedConv, setSelectedConv] = useState<{ id: number; participant: any } | null>(null);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === "new_message") {
        queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      }
    });
    return unsub;
  }, [subscribe, queryClient]);

  const handleNewChat = async (userId: string) => {
    try {
      const conv = await createConversation.mutateAsync({ data: { userId } });
      setSelectedConv({ id: conv.id, participant: conv.participant });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
    } catch {}
  };

  return (
    <AuthWrapper>
      <div className="max-w-5xl mx-auto pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-3xl font-bold text-foreground">Messages</h1>
          <NewChatDialog onSelect={handleNewChat} />
        </div>

        <Card className="bg-card shadow-sm border-border/60 overflow-hidden">
          <div className="flex h-[600px]">
            <div className={`w-full md:w-80 border-r border-border/50 flex flex-col ${selectedConv ? "hidden md:flex" : "flex"}`}>
              <div className="p-3 border-b border-border/50">
                <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> Conversations
                </h2>
              </div>
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="p-3 space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : !data?.conversations?.length ? (
                  <div className="text-center py-16 text-muted-foreground px-4">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">Start a new chat to begin messaging</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {data.conversations.map((conv) => {
                      const name = conv.participant?.firstName
                        ? `${conv.participant.firstName} ${conv.participant.lastName || ""}`.trim()
                        : conv.participant?.username || "User";
                      const isActive = selectedConv?.id === conv.id;
                      return (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConv({ id: conv.id, participant: conv.participant })}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left ${isActive ? "bg-muted/70" : ""}`}
                        >
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarImage src={conv.participant?.profileImageUrl} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {conv.participant?.firstName?.charAt(0) || conv.participant?.username?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm truncate">{name}</span>
                              {(conv.unreadCount ?? 0) > 0 && (
                                <Badge variant="default" className="ml-2 h-5 min-w-[20px] justify-center text-[10px]">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {conv.lastMessage.senderId === user?.id ? "You: " : ""}
                                {conv.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className={`flex-1 flex flex-col ${!selectedConv ? "hidden md:flex" : "flex"}`}>
              {selectedConv ? (
                <MessageView
                  conversationId={selectedConv.id}
                  participant={selectedConv.participant}
                  onBack={() => setSelectedConv(null)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Select a conversation or start a new chat</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </AuthWrapper>
  );
}
