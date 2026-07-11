import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { FunMedia } from "./funTypes";

type Props = {
  items: FunMedia[];
  startIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export default function MediaLightbox({
  items,
  startIndex,
  onClose,
  onIndexChange,
}: Props) {
  const index = Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0));
  const item = items[index];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const indexRef = useRef(index);
  const itemCountRef = useRef(items.length);

  indexRef.current = index;
  itemCountRef.current = items.length;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const previousBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    };

    const onKey = (e: KeyboardEvent) => {
      const currentIndex = indexRef.current;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowRight" && currentIndex < itemCountRef.current - 1) {
        e.preventDefault();
        onIndexChange(currentIndex + 1);
      }
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        e.preventDefault();
        onIndexChange(currentIndex - 1);
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            "button:not([disabled]), video[controls]"
          )
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = `-${scrollX}px`;
    document.body.style.right = "0";
    document.body.style.width = "100%";
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousBodyStyles.overflow;
      document.body.style.position = previousBodyStyles.position;
      document.body.style.top = previousBodyStyles.top;
      document.body.style.left = previousBodyStyles.left;
      document.body.style.right = previousBodyStyles.right;
      document.body.style.width = previousBodyStyles.width;
      window.scrollTo(scrollX, scrollY);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [onClose, onIndexChange]);

  if (!item) return null;

  return createPortal(
    <div
      className="fun-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Attachment ${index + 1} of ${items.length}`}
      ref={dialogRef}
      onClick={onClose}
    >
      <button
        type="button"
        className="fun-lightbox-close"
        aria-label="Close attachment viewer"
        ref={closeButtonRef}
        onClick={onClose}
      >
        ×
      </button>
      {items.length > 1 && index > 0 && (
        <button
          type="button"
          className="fun-lightbox-nav prev"
          aria-label="Previous attachment"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index - 1);
          }}
        >
          ‹
        </button>
      )}
      {items.length > 1 && index < items.length - 1 && (
        <button
          type="button"
          className="fun-lightbox-nav next"
          aria-label="Next attachment"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index + 1);
          }}
        >
          ›
        </button>
      )}
      <div className="fun-lightbox-stage" onClick={(e) => e.stopPropagation()}>
        {item.type === "video" ? (
          <video
            key={item.src}
            src={item.src}
            poster={item.poster || undefined}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <img
            src={item.src}
            alt={`Attachment ${index + 1} of ${items.length}`}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
