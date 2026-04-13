import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useCreatePost, useToggleReaction, useListComments, useCreateComment, useDeletePost } from "@workspace/api-client-react";
import { AuthWrapper } from "@/components/auth-wrapper";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { formatDistanceToNow } from "date-fns";
import { BASE_URL } from "@/lib/api";
import {
  Heart,
  MessageCircle,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function PostComments({ postId }: { postId: number }) {
  const { user } = useAuth();
  const { data, isLoading } = useListComments(postId);
  const createComment = useCreateComment();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await createComment.mutateAsync({ postId, data: { content: text.trim() } });
    setText("");
    queryClient.invalidateQueries({ queryKey: [`/api/social/posts/${postId}/comments`] });
    queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        data?.comments?.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarImage src={c.author?.profileImageUrl} />
              <AvatarFallback className="text-xs bg-muted">
                {c.author?.firstName?.charAt(0) || c.author?.username?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted/50 rounded-xl px-3 py-2 flex-1">
              <span className="font-semibold text-xs text-foreground">
                {c.author?.firstName ? `${c.author.firstName} ${c.author.lastName || ""}`.trim() : c.author?.username || "User"}
              </span>
              <p className="text-sm text-foreground/90">{c.content}</p>
              <span className="text-xs text-muted-foreground">
                {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ""}
              </span>
            </div>
          </div>
        ))
      )}
      <div className="flex gap-2 items-end">
        <Avatar className="w-7 h-7 shrink-0">
          <AvatarImage src={user?.profileImageUrl} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {user?.firstName?.charAt(0) || user?.username?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 bg-muted/50 rounded-full px-3 py-1.5 text-sm border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleSubmit}
            disabled={!text.trim() || createComment.isPending}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, currentUserId }: { post: any; currentUserId: string }) {
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const toggleReaction = useToggleReaction();
  const deletePost = useDeletePost();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    setLiked(post.liked);
    setLikesCount(post.likesCount);
  }, [post.liked, post.likesCount]);

  const handleLike = async () => {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    try {
      const result = await toggleReaction.mutateAsync({ postId: post.id });
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch {
      setLiked(post.liked);
      setLikesCount(post.likesCount);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync({ postId: post.id });
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      toast({ title: "Post deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const authorName = post.author?.firstName
    ? `${post.author.firstName} ${post.author.lastName || ""}`.trim()
    : post.author?.username || "User";

  return (
    <Card className="bg-card shadow-sm border-border/60 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10 border border-border/50">
            <AvatarImage src={post.author?.profileImageUrl} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {post.author?.firstName?.charAt(0) || post.author?.username?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm text-foreground">{authorName}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ""}
                </span>
              </div>
              {post.author?.id === currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap break-words">
              {post.content}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 text-xs h-8 ${liked ? "text-rose-500 hover:text-rose-600" : "text-muted-foreground hover:text-foreground"}`}
            onClick={handleLike}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
            {likesCount > 0 && likesCount}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="w-4 h-4" />
            {post.commentsCount > 0 && post.commentsCount}
            {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        {showComments && <PostComments postId={post.id} />}
      </CardContent>
    </Card>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();
  const createPost = useCreatePost();
  const [newPostContent, setNewPostContent] = useState("");
  const { toast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | undefined>();

  const fetchPosts = async (cursor?: number) => {
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", String(cursor));
    const res = await fetch(`${BASE_URL}api/social/posts?${params}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load posts");
    return res.json();
  };

  const loadInitial = async () => {
    setLoading(true);
    try {
      const data = await fetchPosts();
      setPosts(data.posts || []);
      setNextCursor(data.nextCursor);
    } catch {
      toast({ title: "Failed to load feed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPosts(nextCursor);
      setPosts((prev) => [...prev, ...(data.posts || [])]);
      setNextCursor(data.nextCursor);
    } catch {
      toast({ title: "Failed to load more", variant: "destructive" });
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      if (msg.type === "new_post" || msg.type === "delete_post" || msg.type === "reaction_update" || msg.type === "new_comment") {
        loadInitial();
      }
    });
    return unsubscribe;
  }, [subscribe]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    try {
      await createPost.mutateAsync({ data: { content: newPostContent.trim() } });
      setNewPostContent("");
      loadInitial();
    } catch {
      toast({ title: "Failed to create post", variant: "destructive" });
    }
  };

  return (
    <AuthWrapper>
      <div className="max-w-2xl mx-auto pb-12">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-6">News Feed</h1>

        <Card className="mb-6 bg-card shadow-sm border-border/60">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10 border border-border/50">
                <AvatarImage src={user?.profileImageUrl} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {user?.firstName?.charAt(0) || user?.username?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="min-h-[80px] resize-none border-border/50 bg-muted/30 focus-visible:ring-primary/50"
                  maxLength={2000}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted-foreground">
                    {newPostContent.length}/2000
                  </span>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim() || createPost.isPending}
                    size="sm"
                    className="gap-1.5"
                  >
                    {createPost.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No posts yet</p>
            <p className="text-sm mt-1">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <PostCard key={post.id} post={post} currentUserId={user?.id || ""} />
            ))}
            {nextCursor && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthWrapper>
  );
}
