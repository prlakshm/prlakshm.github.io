/* Entrances, the case studies' way (public/mixr's .rv): each block is hidden
   by CSS from the first paint (.enter, tokens.css) and gets .is-in once it
   scrolls into view, so a CSS transition carries it in off the main thread.
   Nothing waits for fonts. A block with an image waits for that image (capped),
   so art never fades in empty. */

export type RevealItem = {
  el: HTMLElement;
  /** seconds, as a transition-delay */
  delay?: number;
  /** reveal only once this (or all of these) has loaded (or failed, or after
      1.2 s). Give a set the same images so it ripples evenly, instead of each
      piece popping in when its own image happens to arrive. */
  image?: HTMLImageElement | HTMLImageElement[] | null;
};

const IMAGE_CAP_MS = 1200;

const loadedAll = (img: RevealItem["image"]) =>
  Array.isArray(img) ? Promise.all(img.map(loaded)).then(() => {}) : loaded(img);

const loaded = (img: HTMLImageElement | null | undefined) =>
  new Promise<void>((done) => {
    if (!img || (img.complete && img.naturalWidth > 0)) return done();
    const finish = () => {
      window.clearTimeout(cap);
      img.removeEventListener("load", finish);
      img.removeEventListener("error", finish);
      done();
    };
    const cap = window.setTimeout(finish, IMAGE_CAP_MS);
    img.addEventListener("load", finish);
    img.addEventListener("error", finish);
  });

export function revealOnView(items: RevealItem[]) {
  const byEl = new Map(items.map((item) => [item.el, item]));
  let live = true;
  const show = (item: RevealItem) =>
    loadedAll(item.image).then(() => {
      if (!live) return;
      item.el.style.transitionDelay = item.delay ? `${item.delay}s` : "";
      item.el.classList.add("is-in");
    });
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const item = byEl.get(entry.target as HTMLElement);
        if (item) show(item);
      }),
    { rootMargin: "0px 0px -10% 0px", threshold: 0.06 }
  );
  // Already on screen at mount: start on the next frame, rather than wait for
  // the observer's first callback, which a busy page load delays.
  const onScreen = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.9 && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
  };
  const now: RevealItem[] = [];
  items.forEach((item) => {
    if (item.el.classList.contains("is-in")) return;
    if (onScreen(item.el)) now.push(item);
    else io.observe(item.el);
  });
  const frame = requestAnimationFrame(() => now.forEach(show));
  return () => {
    live = false;
    cancelAnimationFrame(frame);
    io.disconnect();
  };
}
