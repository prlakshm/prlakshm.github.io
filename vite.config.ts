import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/* Standalone case studies live in public/ as their own HTML documents rather
   than as routes in the SPA. A static host resolves "/surprise-rail/" to the
   index.html inside that folder on its own, but vite's dev server does not: its
   SPA fallback catches the directory request first and hands back the portfolio
   shell. That makes such a link work when deployed and break locally — so
   rewrite the directory form to the file before the fallback ever sees it.

   Only folders that really do hold an index.html are rewritten, so an unrelated
   404 still reads as a 404 instead of being redirected into nothing.

   That check is made PER REQUEST rather than once at boot. Scanning public/ at
   startup meant a case study added while the server was running stayed invisible
   to it: the folder existed on disk, the deployed link was fine, and localhost
   quietly served the SPA shell instead until someone thought to restart. The
   stat is one existsSync on a path that already matched the bare-directory
   shape, so it only runs on requests that could plausibly be a case study. */
function publicDirIndexes() {
  const root = resolve(__dirname, "public");

  return {
    name: "public-dir-indexes",
    configureServer(server: import("vite").ViteDevServer) {
      if (!existsSync(root)) return;
      server.middlewares.use((req, _res, next) => {
        const url = req.url;
        if (url) {
          const [path, query] = url.split("?");
          const name = /^\/([^/]+)\/$/.exec(path)?.[1];
          /* Segment is slash-free by construction, but ".." would still climb
             out of public/ once resolve() got hold of it. */
          if (
            name &&
            /^[\w.-]+$/.test(name) &&
            name !== "." &&
            name !== ".." &&
            existsSync(resolve(root, name, "index.html"))
          ) {
            req.url = `/${name}/index.html${query ? `?${query}` : ""}`;
          }
        }
        next();
      });
    },
  };
}

/* The static case studies wear the app's own nav and footer.

   Each holds mount points (#site-nav, #site-foot) and gets src/static-chrome.tsx,
   which renders the same NavBar and SiteFooter that Home and About do into
   them, so the pages can no longer drift from the app.

   Dev: a mounted page is served with Vite's client, React's refresh preamble
   and the entry script added, so it runs (and hot-reloads) like the app.
   Build: the entry is a second input, and its hashed script, its stylesheets
   and its chunks' preloads are written into the copied pages. The stylesheets
   go first in the document, ahead of the page's own <style>, so the page still
   wins any rule the two share. */
const CHROME_ENTRY = "src/static-chrome.tsx";
const hasChromeMount = (html: string) => /\sid="site-(nav|foot)"/.test(html);
// the pages omit <head>; this is the first line of every one of them
const afterCharset = (html: string, tags: string) =>
  html.replace(/<meta charset[^>]*>/i, (m) => `${m}\n${tags}`);

type BuiltChunk = {
  type: "chunk";
  isEntry: boolean;
  name: string;
  fileName: string;
  imports: string[];
  viteMetadata?: { importedCss: Set<string> };
};

function siteChrome(): Plugin {
  const pub = resolve(__dirname, "public");
  let base = "/";

  return {
    name: "site-chrome",
    config(_config, env) {
      if (env.command !== "build") return;
      return {
        build: {
          rollupOptions: {
            input: {
              main: resolve(__dirname, "index.html"),
              about: resolve(__dirname, "about/index.html"),
              "static-chrome": resolve(__dirname, CHROME_ENTRY),
            },
          },
        },
      };
    },
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      // Runs after publicDirIndexes has turned /name/ into /name/index.html.
      server.middlewares.use((req, res, next) => {
        const name = /^\/([\w.-]+)\/index\.html$/.exec(req.url?.split("?")[0] ?? "")?.[1];
        const file = name && name !== ".." ? resolve(pub, name, "index.html") : "";
        if (!file || !existsSync(file)) return next();
        const html = readFileSync(file, "utf8");
        if (!hasChromeMount(html)) return next();
        const head =
          `<script type="module" src="${base}@vite/client"></script>\n` +
          `<script type="module">${react.preambleCode.replace("__BASE__", base)}</script>`;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.end(afterCharset(html, head) + `\n<script type="module" src="${base}${CHROME_ENTRY}"></script>\n`);
      });
    },
    writeBundle(options, bundle) {
      const chunks = bundle as unknown as Record<string, BuiltChunk | { type: "asset" }>;
      const entry = Object.values(chunks).find(
        (c): c is BuiltChunk => c.type === "chunk" && c.isEntry && c.name === "static-chrome"
      );
      if (!entry || !options.dir) return;

      // The entry's stylesheets and those of every chunk it imports statically.
      const css = new Set<string>();
      const preload = new Set<string>();
      const walk = (fileName: string) => {
        const c = chunks[fileName];
        if (!c || c.type !== "chunk" || preload.has(fileName)) return;
        preload.add(fileName);
        c.viteMetadata?.importedCss.forEach((f) => css.add(f));
        c.imports.forEach(walk);
      };
      walk(entry.fileName);
      preload.delete(entry.fileName);

      const head = [
        ...[...css].map((f) => `<link rel="stylesheet" href="${base}${f}">`),
        ...[...preload].map((f) => `<link rel="modulepreload" href="${base}${f}">`),
      ].join("\n");
      const script = `\n<script type="module" src="${base}${entry.fileName}"></script>\n`;

      for (const name of readdirSync(pub)) {
        const file = resolve(options.dir, name, "index.html");
        if (!existsSync(resolve(pub, name, "index.html")) || !existsSync(file)) continue;
        const html = readFileSync(file, "utf8");
        if (hasChromeMount(html)) writeFileSync(file, afterCharset(html, head) + script);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), publicDirIndexes(), siteChrome()],
});
