// For pages whose title and description depend on their content (a section, a guide).
// App.jsx leaves these routes alone so the page can set them itself.
const SITE = "https://asknyaya.in";

function set(sel, attr, value) {
  const el = document.head.querySelector(sel);
  if (el) el.setAttribute(attr, value);
}

export function setPageMeta({ title, description, path }) {
  document.title = title;
  if (description) {
    set('meta[name="description"]', "content", description);
    set('meta[property="og:description"]', "content", description);
  }
  set('meta[property="og:title"]', "content", title);
  if (path) {
    set('meta[property="og:url"]', "content", SITE + path);
    set('link[rel="canonical"]', "href", SITE + path);
  }
}
