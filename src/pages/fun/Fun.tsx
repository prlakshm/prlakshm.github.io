import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  { x: 2.03, y: 2, z: 12 },
  { x: 13.39, y: 20.86, z: 22 },
  { x: 66.3, y: 1.8, z: 14 },
  { x: 34.14, y: 3.01, z: 20 },
  { x: 65.8, y: 20.04, z: 18 },
  { x: 34.38, y: 35.96, z: 8 },
  { x: 1.81, y: 33.47, z: 16 },
  { x: 34.42, y: 64.6, z: 13 },
  { x: 1.61, y: 87.3, z: 19 },
  { x: 3.91, y: 58, z: 17 },
  { x: 66.04, y: 74.6, z: 10 },
  { x: 36, y: 99.6, z: 15 },
  { x: 66.04, y: 57, z: 21 },
];

const BOUNCE_DURATION = 420;
const BOTTOM_SPRING_RISE = 70;
const REVEAL_STAGGER = 70;

const DESKTOP_COLUMNS = [
  [0, 5, 6, 10],
  [3, 1, 7, 9],
  [2, 4, 8, 11, 12],
];
const DESKTOP_COLUMN_GAP = 22;
const DESKTOP_COLUMN_TOP = [46, 69, 41];
const MOBILE_STACK_ORDER = [0, 3, 2, 1, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const CARD_GAPS = [0, 20, 0, 0, 42, 28, 42, 22, 50, 24, 20, 46, 38];
const STACK_BOTTOM_PADDING = 48;

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

function getResponsiveColumnCount() {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth <= 768) return 1;
  if (window.innerWidth < 1080) return 2;
  return 3;
}

function useResponsiveColumnCount() {
  const [columnCount, setColumnCount] = useState(getResponsiveColumnCount);
  useEffect(() => {
    const onResize = () => setColumnCount(getResponsiveColumnCount());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return columnCount;
}

function Fun() {
  const columnCount = useResponsiveColumnCount();
  const isMobile = columnCount === 1;
  const boardRef = useRef<HTMLDivElement>(null);
  const topZ = useRef(30);
  const positionsRef = useRef<Record<string, Pos>>({});
  const bounceTimerRef = useRef<number | null>(null);
  const [boardHeight, setBoardHeight] = useState<number | null>(null);
  const revealedIdsRef = useRef(new Set<string>());
  const [revealDelays, setRevealDelays] = useState<Record<string, number>>({});
  const [bottomBounce, setBottomBounce] = useState<{
    id: string;
    releaseOffset: number;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const initialPositions = useMemo(() => {
    const layouts = isMobile ? MOBILE_LAYOUTS : DESKTOP_LAYOUTS;
    const map: Record<string, Pos> = {};
    posts.forEach((p, i) => {
      const layout = layouts[i] || layouts[0];
      map[p.id] = {
        ...layout,
        // Spread the inset collage 5% around the cards' horizontal centers.
        x: isMobile ? 5.87 + layout.x * 0.42 : 3.5 + layout.x * 0.945,
      };
    });
    return map;
  }, [isMobile]);

  const [positions, setPositions] = useState<Record<string, Pos>>(initialPositions);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const cards = Array.from(
      board.querySelectorAll<HTMLElement>(".x-post-card[data-post-id]")
    );
    let frame = 0;

    const calculateStack = () => {
      const heights = new Map(
        cards.map((card) => [
          card.dataset.postId as string,
          card.getBoundingClientRect().height,
        ])
      );
      const pixelPositions: Record<string, Pos> = {};
      let tallestColumn = 0;

      if (isMobile) {
        const cardWidth = cards[0]?.getBoundingClientRect().width ?? 0;
        const centeredX =
          ((board.clientWidth - cardWidth) / 2 / board.clientWidth) * 100;
        let cursor = 24;
        MOBILE_STACK_ORDER.forEach((index, stackIndex) => {
          const post = posts[index];
          if (stackIndex > 0) cursor += Math.max(20, CARD_GAPS[index]);
          pixelPositions[post.id] = {
            x: centeredX,
            y: cursor,
            z: MOBILE_LAYOUTS[index]?.z ?? 10,
          };
          cursor += heights.get(post.id) ?? 0;
        });
        tallestColumn = cursor;
      } else {
        const cardWidth = cards[0]?.getBoundingClientRect().width ?? 0;
        const columnsWidth =
          cardWidth * columnCount + DESKTOP_COLUMN_GAP * (columnCount - 1);
        const firstColumnLeft = Math.max(0, (board.clientWidth - columnsWidth) / 2);
        const columnX = Array.from(
          { length: columnCount },
          (_, columnIndex) =>
            ((firstColumnLeft + columnIndex * (cardWidth + DESKTOP_COLUMN_GAP)) /
              board.clientWidth) *
            100
        );

        if (columnCount === 2) {
          const cursors = [36, 52];
          const cardsInColumn = [0, 0];

          MOBILE_STACK_ORDER.forEach((index, orderIndex) => {
            const columnIndex =
              orderIndex < 2
                ? orderIndex
                : cursors[0] <= cursors[1]
                  ? 0
                  : 1;
            const post = posts[index];
            if (cardsInColumn[columnIndex] > 0) {
              cursors[columnIndex] += Math.max(20, CARD_GAPS[index]);
            }
            pixelPositions[post.id] = {
              x: columnX[columnIndex],
              y: cursors[columnIndex],
              z: DESKTOP_LAYOUTS[index]?.z ?? 10,
            };
            cursors[columnIndex] += heights.get(post.id) ?? 0;
            cardsInColumn[columnIndex] += 1;
          });
          tallestColumn = Math.max(...cursors);
        } else {
          DESKTOP_COLUMNS.forEach((column, columnIndex) => {
            let cursor = DESKTOP_COLUMN_TOP[columnIndex];
            column.forEach((index, stackIndex) => {
              const post = posts[index];
              if (stackIndex > 0) cursor += CARD_GAPS[index];
              pixelPositions[post.id] = {
                x: columnX[columnIndex],
                y: cursor,
                z: DESKTOP_LAYOUTS[index]?.z ?? 10,
              };
              cursor += heights.get(post.id) ?? 0;
            });
            tallestColumn = Math.max(tallestColumn, cursor);
          });
        }
      }

      const nextBoardHeight = Math.ceil(tallestColumn + STACK_BOTTOM_PADDING);
      const nextPositions = Object.fromEntries(
        Object.entries(pixelPositions).map(([id, pos]) => [
          id,
          { ...pos, y: (pos.y / nextBoardHeight) * 100 },
        ])
      );

      setBoardHeight(nextBoardHeight);
      setPositions(nextPositions);
      positionsRef.current = nextPositions;
    };

    const scheduleStack = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(calculateStack);
    };
    const resizeObserver = new ResizeObserver(scheduleStack);
    cards.forEach((card) => resizeObserver.observe(card));
    scheduleStack();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [columnCount, isMobile]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const cards = Array.from(
      board.querySelectorAll<HTMLElement>(".x-post-card[data-post-id]")
    );
    const revealAll = () => {
      const next = Object.fromEntries(
        cards.map((card) => [card.dataset.postId as string, 0])
      );
      cards.forEach((card) => {
        if (card.dataset.postId) revealedIdsRef.current.add(card.dataset.postId);
      });
      setRevealDelays(next);
    };

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      revealAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            const topDifference = a.boundingClientRect.top - b.boundingClientRect.top;
            return topDifference || a.boundingClientRect.left - b.boundingClientRect.left;
          });

        if (entering.length === 0) return;

        const newlyRevealed: Array<{ id: string; delay: number }> = [];
        entering.forEach((entry, index) => {
          const card = entry.target as HTMLElement;
          const id = card.dataset.postId;
          if (!id || revealedIdsRef.current.has(id)) return;

          revealedIdsRef.current.add(id);
          newlyRevealed.push({ id, delay: index * REVEAL_STAGGER });
          observer.unobserve(card);
        });

        if (newlyRevealed.length > 0) {
          setRevealDelays((previous) => {
            const next = { ...previous };
            newlyRevealed.forEach(({ id, delay }) => {
              next[id] = delay;
            });
            return next;
          });
        }
      },
      { rootMargin: "10000px 0px 3% 0px", threshold: 0.01 }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    pointerId: number;
    maxY: number;
  } | null>(null);

  const [lightbox, setLightbox] = useState<{
    postId: string;
    index: number;
  } | null>(null);

  const lightboxPost = lightbox
    ? posts.find((p) => p.id === lightbox.postId)
    : null;

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDraggingId(null);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    const board = boardRef.current;
    if (!drag || !board) return;
    if (e.pointerId !== drag.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      topZ.current += 1;
      setDraggingId(drag.id);
      setPositions((prev) => ({
        ...prev,
        [drag.id]: { ...prev[drag.id], z: topZ.current },
      }));
    }
    e.preventDefault();

    const rect = board.getBoundingClientRect();
    const nextX = drag.originX + (dx / rect.width) * 100;
    const rawY = drag.originY + (dy / rect.height) * 100;
    const overflow = Math.max(0, rawY - drag.maxY);
    const nextY = overflow > 0
      ? drag.maxY + Math.min(2.25, overflow * 0.22)
      : rawY;

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

      const current = positionsRef.current[drag.id];
      if (current && current.y > drag.maxY) {
        const boardHeight = boardRef.current?.clientHeight ?? 0;
        const overflowOffset = Math.max(
          0,
          ((current.y - drag.maxY) / 100) * boardHeight
        );
        const targetY = Math.max(
          0,
          drag.maxY - (BOTTOM_SPRING_RISE / boardHeight) * 100
        );
        const springRise = ((drag.maxY - targetY) / 100) * boardHeight;
        setPositions((prev) => {
          const next = {
            ...prev,
            [drag.id]: { ...prev[drag.id], y: targetY },
          };
          positionsRef.current = next;
          return next;
        });
        setBottomBounce({
          id: drag.id,
          releaseOffset: overflowOffset + springRise,
        });
        if (bounceTimerRef.current !== null) {
          window.clearTimeout(bounceTimerRef.current);
        }
        bounceTimerRef.current = window.setTimeout(() => {
          setBottomBounce(null);
          bounceTimerRef.current = null;
        }, BOUNCE_DURATION);
      }

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
      if (target.closest(".x-media-item, a, button.x-media-item")) {
        return;
      }

      e.preventDefault();
      const cardHeight = e.currentTarget.getBoundingClientRect().height;
      const boardRect = board.getBoundingClientRect();
      const footerBottom = document.querySelector(".footer")?.getBoundingClientRect().bottom;
      const bottomBoundary = footerBottom === undefined
        ? board.clientHeight
        : footerBottom - boardRect.top;
      const maxTop = Math.max(0, bottomBoundary - cardHeight);
      dragRef.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        originX: pos.x,
        originY: pos.y,
        moved: false,
        pointerId: e.pointerId,
        maxY: (maxTop / board.clientHeight) * 100,
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
      if (bounceTimerRef.current !== null) {
        window.clearTimeout(bounceTimerRef.current);
      }
    };
  }, [onPointerMove, onPointerUp]);

  const openMedia = (post: FunPost, index: number) => {
    setLightbox({ postId: post.id, index });
  };

  const closeLightbox = useCallback(() => setLightbox(null), []);
  const changeLightboxIndex = useCallback((index: number) => {
    setLightbox((prev) => (prev ? { ...prev, index } : prev));
  }, []);

  return (
    <div className="fun-app">
      <div
        className="fun-board"
        ref={boardRef}
        style={boardHeight ? { height: `${boardHeight}px` } : undefined}
      >
        {posts.map((post) => {
          const pos = positions[post.id] || post.layout;
          const style: CSSProperties = {
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            zIndex: pos.z,
            ...({
              "--reveal-delay": `${revealDelays[post.id] ?? 0}ms`,
            } as CSSProperties),
            ...(bottomBounce?.id === post.id
              ? ({ "--bounce-release-offset": `${bottomBounce.releaseOffset}px` } as CSSProperties)
              : {}),
          };
          return (
            <XPostCard
              key={post.id}
              post={post}
              style={style}
              isRevealed={post.id in revealDelays}
              isDragging={draggingId === post.id}
              isBottomBouncing={bottomBounce?.id === post.id}
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
