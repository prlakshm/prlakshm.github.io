import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { FunPost } from "./funTypes";
import { formatPostTimestamp, linkifyText } from "./funTypes";

type Props = {
  post: FunPost;
  style: CSSProperties;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onOpenMedia: (index: number) => void;
  onOpenPost: () => void;
};

function VerifiedBadge() {
  return (
    <svg
      className="x-verified"
      viewBox="0 0 22 22"
      aria-label="Verified"
      role="img"
    >
      <path
        fill="#1d9bf0"
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.878-1.683-.44-.464-1.002-.8-1.634-.972-.633-.172-1.294-.15-1.9.07-.46-.588-1.068-1.05-1.76-1.34C11.675 1.74 10.85 1.5 10 1.5s-1.675.24-2.356.676c-.692.29-1.3.752-1.76 1.34-.606-.22-1.267-.242-1.9-.07-.632.172-1.194.508-1.634.972-.441.465-.747 1.05-.878 1.683-.13.633-.083 1.29.14 1.897-.586.274-1.084.706-1.438 1.246-.355.541-.552 1.17-.57 1.816.018.646.215 1.275.57 1.816.354.54.852.972 1.438 1.246-.223.607-.27 1.264-.14 1.897.131.634.437 1.218.878 1.683.44.464 1.002.8 1.634.972.633.172 1.294.15 1.9-.07.46.588 1.068 1.05 1.76 1.34.681.436 1.506.676 2.356.676s1.675-.24 2.356-.676c.692-.29 1.3-.752 1.76-1.34.606.22 1.267.242 1.9.07.632-.172 1.194-.508 1.634-.972.441-.465.747-1.05.878-1.683.13-.633.083-1.29-.14-1.897.586-.274 1.084-.706 1.438-1.246.355-.541.552-1.17.57-1.816z"
      />
      <path
        fill="#fff"
        d="M9.57 15.5L5.75 11.68l1.41-1.41 2.41 2.41 5.3-5.3 1.41 1.42z"
      />
    </svg>
  );
}

function IconBtn({
  children,
  label,
  className = "",
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span className={`x-icon-btn ${className}`.trim()} aria-label={label} title={label}>
      {children}
    </span>
  );
}

export default function XPostCard({
  post,
  style,
  onPointerDown,
  onOpenMedia,
  onOpenPost,
}: Props) {
  const mediaCount = post.media.length;

  return (
    <article
      className="x-post-card"
      style={style}
      onPointerDown={onPointerDown}
    >
      <header className="x-post-header">
        <button type="button" className="x-header-main" onClick={onOpenPost}>
          <span className="x-avatar-wrap">
            <img className="x-avatar" src={post.avatar} alt="" draggable={false} />
          </span>
          <div className="x-meta">
            <div className="x-name-row">
              <span className="x-name">{post.name}</span>
              <VerifiedBadge />
            </div>
            <span className="x-handle">@{post.handle}</span>
          </div>
        </button>
        <div className="x-header-actions" onPointerDown={(e) => e.stopPropagation()}>
          <IconBtn label="Not interested">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 3.75c-4.56 0-8.25 3.69-8.25 8.25s3.69 8.25 8.25 8.25 8.25-3.69 8.25-8.25S16.56 3.75 12 3.75zM1.75 12C1.75 6.34 6.34 1.75 12 1.75S22.25 6.34 22.25 12 17.66 22.25 12 22.25 1.75 17.66 1.75 12zm7.47-2.78l2.78 2.78-2.78 2.78 1.41 1.41L13.41 13.41l2.78 2.78 1.41-1.41-2.78-2.78 2.78-2.78-1.41-1.41L13.41 10.59 10.63 7.81 9.22 9.22z"
              />
            </svg>
          </IconBtn>
          <IconBtn label="More">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"
              />
            </svg>
          </IconBtn>
        </div>
      </header>

      <div className="x-body" onClick={onOpenPost}>
        <p>{linkifyText(post.text)}</p>
      </div>

      {mediaCount > 0 && (
        <div className={`x-media x-media-count-${Math.min(mediaCount, 4)}`}>
          {post.media.slice(0, 4).map((m, i) => (
            <button
              type="button"
              className="x-media-item"
              key={`${post.id}-media-${i}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenMedia(i);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {m.type === "video" ? (
                <>
                  <img src={m.poster || m.src} alt="" draggable={false} />
                  <span className="x-play" aria-hidden="true">
                    ▶
                  </span>
                </>
              ) : (
                <img src={m.src} alt="" draggable={false} />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="x-timestamp" onClick={onOpenPost}>
        {formatPostTimestamp(post.createdAt)}
      </div>

      <div className="x-actions" onPointerDown={(e) => e.stopPropagation()}>
        <IconBtn label="Reply" className="x-action reply">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.167C5.335 18.01 1.751 14.42 1.751 10zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"
            />
          </svg>
        </IconBtn>
        <IconBtn label="Repost" className="x-action repost">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.791-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"
            />
          </svg>
        </IconBtn>
        <IconBtn label="Like" className="x-action like">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.43 4.82 1.155 2.22 3.615 4.61 6.15 7.02 2.535-2.41 4.995-4.8 6.15-7.02 1.063-2.04.982-3.7.431-4.82-.561-1.13-1.667-1.84-2.91-1.91zm4.187 7.69c-1.351 2.6-4.025 5.24-6.884 7.81l-1 1.02-1-1.02c-2.859-2.57-5.533-5.21-6.884-7.81-1.412-2.71-1.645-5.07-.831-7.11.736-1.84 2.397-3.03 4.37-3.14 1.402-.08 2.905.46 4.127 1.66L12 6.35l.918-.94c1.222-1.2 2.725-1.74 4.127-1.66 1.973.11 3.634 1.3 4.37 3.14.814 2.04.581 4.4-.831 7.11z"
            />
          </svg>
        </IconBtn>
        <IconBtn label="Bookmark" className="x-action bookmark">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"
            />
          </svg>
        </IconBtn>
        <IconBtn label="Share" className="x-action share">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"
            />
          </svg>
        </IconBtn>
      </div>
    </article>
  );
}
