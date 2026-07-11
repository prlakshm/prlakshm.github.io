import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import funPosts from "./fun-posts.json";
import type { FunPost } from "./funTypes";
import XPostCard from "./XPostCard";
import MediaLightbox from "./MediaLightbox";
import "./fun.css";

type Pos = { x: number; y: number; z: number };

const posts = funPosts as FunPost[];

/** Loosely staggered collage: readable structure with intentional overlap. */
const DESKTOP_LAYOUTS: Pos[] = [
  { x: 2, y: 2, z: 20 },
  { x: 2, y: 22, z: 8 },
  { x: 66, y: 1, z: 14 },
  { x: 34, y: 3, z: 11 },
  { x: 66, y: 18, z: 18 },
  { x: 34, y: 21, z: 7 },
  { x: 2, y: 38, z: 16 },
  { x: 34, y: 41, z: 12 },
  { x: 66, y: 38, z: 19 },
  { x: 2, y: 57, z: 6 },
  { x: 66, y: 56, z: 15 },
  { x: 34, y: 70, z: 9 },
  { x: 2, y: 76, z: 10 },
];

const MOBILE_LAYOUTS: Pos[] = [
  { x: -2, y: 3, z: 20 },
  { x: 18, y: 8, z: 8 },
  { x: 0, y: 22, z: 14 },
  { x: 16, y: 28, z: 11 },
  { x: -4, y: 40, z: 18 },
  { x: 14, y: 46, z: 7 },
  { x: -2, y: 58, z: 16 },
  { x: 16, y: 66, z: 12 },
  { x: -6, y: 78, z: 19 },
  { x: 12, y: 86, z: 6 },
  { x: 0, y: 98, z: 15 },
  { x: 14, y: 106, z: 9 },
  { x: 4, y: 72, z: 10 },
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

  const openMedia = (post: FunPost, index: number) => {
    if (didDragRef.current) return;
    setLightbox({ postId: post.id, index });
  };

  const closeLightbox = useCallback(() => setLightbox(null), []);
  const changeLightboxIndex = useCallback((index: number) => {
    setLightbox((prev) => (prev ? { ...prev, index } : prev));
  }, []);

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
            />
          );
        })}
      </div>

      {lightbox && lightboxPost && (
        <MediaLightbox
          items={lightboxPost.media}
          startIndex={lightbox.index}
          onClose={closeLightbox}
          onIndexChange={changeLightboxIndex}
        />
      )}
    </div>
  );
}

export default Fun;
