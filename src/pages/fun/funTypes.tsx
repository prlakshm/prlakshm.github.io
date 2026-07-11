import type { ReactNode } from "react";

export type FunMedia = {
  type: "image" | "video";
  src: string;
  poster?: string | null;
};

export type FunPost = {
  id: string;
  url: string;
  name: string;
  handle: string;
  avatar: string;
  text: string;
  createdAt: string;
  media: FunMedia[];
  layout: { x: number; y: number; z: number };
  mobileLayout: { x: number; y: number; z: number };
};

export function formatPostTimestamp(createdAt: string): string {
  const parsed = Date.parse(createdAt);
  if (Number.isNaN(parsed)) return "";
  const d = new Date(parsed);
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${time} · ${date}`;
}

export function linkifyText(text: string): ReactNode[] {
  const parts = text.split(/(https?:\/\/\S+|#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("#") || part.startsWith("@")) {
      return (
        <span className="x-entity" key={i}>
          {part}
        </span>
      );
    }
    if (part.startsWith("http")) {
      const display = part.replace(/^https?:\/\//, "");
      return (
        <span className="x-entity" key={i}>
          {display.length > 36 ? `${display.slice(0, 36)}…` : display}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
