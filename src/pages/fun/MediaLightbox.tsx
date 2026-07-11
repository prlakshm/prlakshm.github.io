import { useEffect } from "react";
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onIndexChange(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, items.length, onClose, onIndexChange]);

  if (!item) return null;

  return (
    <div className="fun-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="fun-lightbox-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      {items.length > 1 && index > 0 && (
        <button
          type="button"
          className="fun-lightbox-nav prev"
          aria-label="Previous"
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
          aria-label="Next"
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
          <img src={item.src} alt="" />
        )}
      </div>
    </div>
  );
}
