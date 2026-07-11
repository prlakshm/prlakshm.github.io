import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import funPosts from "./fun-posts.json";
import type { FunPost } from "./funTypes";
import XPostCard from "./XPostCard";
import MediaLightbox from "./MediaLightbox";
import "./fun.css";

type Pos = { x: number; y: number; z: number };

const posts = funPosts as FunPost[];

/** Centered collage seeds — keep clear of header (~5.5rem) and footer */
const DESKTOP_LAYOUTS: Pos[] = [
  { x: 8, y: 6, z: 20 },
  { x: 38, y: 4, z: 8 },
  { x: 62, y: 8, z: 12 },
  { x: 18, y: 22, z: 9 },
  { x: 48, y: 20, z: 14 },
  { x: 28, y: 36, z: 7 },
  { x: 58, y: 34, z: 15 },
  { x: 12, y: 48, z: 11 },
  { x: 42, y: 46, z: 16 },
  { x: 66, y: 50, z: 6 },
  { x: 22, y: 62, z: 18 },
  { x: 52, y: 60, z: 5 },
  { x: 36, y: 54, z: 10 },
];

const MOBILE_LAYOUTS: Pos[] = [
  { x: -4, y: 4, z: 20 },
  { x: 22, y: 10, z: 8 },
  { x: -2, y: 28, z: 12 },
  { x: 18, y: 36, z: 9 },
  { x: -6, y: 52, z: 14 },
  { x: 20, y: 60, z: 7 },
  { x: -4, y: 76, z: 15 },
  { x: 18, y: 86, z: 11 },
  { x: -8, y: 102, z: 16 },
  { x: 16, y: 112, z: 6 },
  { x: -2, y: 128, z: 18 },
  { x: 20, y: 138, z: 5 },
  { x: 6, y: 120, z: 10 },
];

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= breakpoint
  );
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return mobile;
}

function Fun() {
  const isMobile = useIsMobile();
  const boardRef = useRef<HTMLDivElement>(null);
  const topZ = useRef(30);
  const positionsRef = useRef<Record<string, Pos>>({});

  const initialPositions = useMemo(() => {
    const layouts = isMobile ? MOBILE_LAYOUTS : DESKTOP_LAYOUTS;
    const map: Record<string, Pos> = {};
    posts.forEach((p, i) => {
      map[p.id] = { ...(layouts[i] || layouts[0]) };
    });
    return map;
  }, [isMobile]);

  const [positions, setPositions] = useState<Record<string, Pos>>(initialPositions);

  useEffect(() => {
    setPositions(initialPositions);
    positionsRef.current = initialPositions;
  }, [initialPositions]);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);
  const didDragRef = useRef(false);

  const [lightbox, setLightbox] = useState<{
    postId: string;
    index: number;
  } | null>(null);

  const lightboxPost = lightbox
    ? posts.find((p) => p.id === lightbox.postId)
    : null;

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    const board = boardRef.current;
    if (!drag || !board) return;
    if (e.pointerId !== drag.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    didDragRef.current = true;
    e.preventDefault();

    const rect = board.getBoundingClientRect();
    const nextX = drag.originX + (dx / rect.width) * 100;
    const nextY = drag.originY + (dy / rect.height) * 100;

    setPositions((prev) => {
      const next = {
        ...prev,
        [drag.id]: {
          ...prev[drag.id],
          x: nextX,
          y: nextY,
        },
      };
      positionsRef.current = next;
      return next;
    });
  }, []);

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      endDrag();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    },
    [endDrag, onPointerMove]
  );

  const onPointerDown = useCallback(
    (id: string, e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      const board = boardRef.current;
      if (!board) return;
      const pos = positionsRef.current[id];
      if (!pos) return;

      // Don't start board-drag from interactive media / action buttons
      const target = e.target as HTMLElement;
      if (target.closest(".x-media-item, .x-actions, a, button.x-media-item")) {
        return;
      }

      e.preventDefault();
      topZ.current += 1;
      setPositions((prev) => {
        const next = {
          ...prev,
          [id]: { ...prev[id], z: topZ.current },
        };
        positionsRef.current = next;
        return next;
      });

      didDragRef.current = false;
      dragRef.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        originX: pos.x,
        originY: pos.y,
        moved: false,
        pointerId: e.pointerId,
      };

      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [onPointerMove, onPointerUp]
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const openPost = (post: FunPost) => {
    if (didDragRef.current) return;
    window.open(post.url, "_blank", "noopener,noreferrer");
  };

  const openMedia = (post: FunPost, index: number) => {
    if (didDragRef.current) return;
    setLightbox({ postId: post.id, index });
  };

  return (
    <div className="fun-app">
      <div className="fun-board" ref={boardRef}>
        {posts.map((post) => {
          const pos = positions[post.id] || post.layout;
          const style: CSSProperties = {
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            zIndex: pos.z,
          };
          return (
            <XPostCard
              key={post.id}
              post={post}
              style={style}
              onPointerDown={(e) => onPointerDown(post.id, e)}
              onOpenMedia={(i) => openMedia(post, i)}
              onOpenPost={() => openPost(post)}
            />
          );
        })}
      </div>

      {lightbox && lightboxPost && (
        <MediaLightbox
          items={lightboxPost.media}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) =>
            setLightbox((prev) => (prev ? { ...prev, index } : prev))
          }
        />
      )}
    </div>
  );
}

export default Fun;
