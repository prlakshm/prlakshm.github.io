const CURRENT_CHROME_ROUTES = new Set([
  "/",
  "/projects",
  "/about",
  "/surprise-rail-v1",
]);

export const normalizeRoutePath = (pathname: string) => {
  if (!pathname || pathname === "/") return "/";
  const normalized = `/${pathname.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  return normalized === "/" ? "/" : normalized;
};

export const normalizeRouteSearch = (search: string) =>
  search === "?" ? "" : search;

export const pageOwnsChrome = (pathname: string) =>
  CURRENT_CHROME_ROUTES.has(normalizeRoutePath(pathname));
