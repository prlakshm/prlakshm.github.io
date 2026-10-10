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
  /** start when THIS comes into view instead of the block itself: a set that
      should arrive as one gesture (a phone's sideways row of posters, whose
      later cards sit off to the side) shares one trigger */
  trigger?: HTMLElement;
};

export type RevealOptions = {
  /** how far into the screen a block must come before it starts */
  rootMargin?: string;
  threshold?: number;
};

const IMAGE_CAP_MS = 1200;

const loadedAll = (img: RevealItem["image"]) =>
  Array.isArray(img) ? Promise.all(img.map(loaded)).then(() => {}) : loaded(img);

/* Loaded AND decoded: an image can have arrived but not be ready to paint
   yet (decoding="async"), and a card would rise in as an empty grey slot for
   a few frames. decode() resolves once it can be drawn. Still capped. */
const loaded = (img: HTMLImageElement | null | undefined) =>
  new Promise<void>((done) => {
    if (!img) return done();
    let over = false;
    const finish = () => {
      if (over) return;
      over = true;
      window.clearTimeout(cap);
      done();
    };
    const cap = window.setTimeout(finish, IMAGE_CAP_MS);
    (img.decode ? img.decode() : Promise.resolve()).then(finish, finish);
  });

export function revealOnView(items: RevealItem[], options: RevealOptions = {}) {
  const byTrigger = new Map<Element, RevealItem[]>();
  items.forEach((item) => {
    const t = item.trigger ?? item.el;
    byTrigger.set(t, [...(byTrigger.get(t) ?? []), item]);
  });
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
        byTrigger.get(entry.target)?.forEach(show);
      }),
    { rootMargin: options.rootMargin ?? "0px 0px -10% 0px", threshold: options.threshold ?? 0.06 }
  );
  // Already on screen at mount: start on the next frame, rather than wait for
  // the observer's first callback, which a busy page load delays.
  const onScreen = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.9 && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
  };
  const now: RevealItem[] = [];
  byTrigger.forEach((set, trigger) => {
    const left = set.filter((item) => !item.el.classList.contains("is-in"));
    if (!left.length) return;
    if (onScreen(trigger as HTMLElement)) now.push(...left);
    else io.observe(trigger);
  });
  const frame = requestAnimationFrame(() => now.forEach(show));
  return () => {
    live = false;
    cancelAnimationFrame(frame);
    io.disconnect();
  };
}
