import { FileText, Book, Video, FileIcon, Presentation } from "lucide-react";

export function getResourceIcon(type: string, size: "sm" | "md" | "lg" = "md") {
  const sizeClass = size === "sm" ? "w-5 h-5" : size === "lg" ? "w-10 h-10" : "w-8 h-8";
  switch (type) {
    case "pdf":    return <FileText className={`${sizeClass} text-red-500`} />;
    case "slides": return <Presentation className={`${sizeClass} text-orange-500`} />;
    case "book":   return <Book className={`${sizeClass} text-blue-500`} />;
    case "video":  return <Video className={`${sizeClass} text-purple-500`} />;
    case "notes":  return <FileText className={`${sizeClass} text-green-500`} />;
    default:       return <FileIcon className={`${sizeClass} text-gray-500`} />;
  }
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}
