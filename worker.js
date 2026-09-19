/**
 * Routing in front of the static assets.
 *
 * The Worker previously ran with not_found_handling: "single-page-application",
 * which answered EVERY unmatched path with index.html at HTTP 200. /vite/.env,
 * /wp-admin/install.php and every scraped typo became a 200-status duplicate of
 * the homepage: Google logs those as soft 404s and spends crawl budget on them,
 * and a scanner reads 200 as a probe worth repeating. NotFoundPage set noindex,
 * but a noindex still costs a crawl - the status code is what settles it.
 *
 * The obvious fix - a _redirects file mapping the routes to /index.html with
 * status 200 - does not work here. Workers Assets rejects rewrites:
 *
 *   Found 5 invalid redirect rules:
 *   Infinite loop detected in this rule and has been ignored.
 *     at _redirects:14 | /auth    /index.html   200
 *
 * Rewrites are a Pages feature, not a Workers Assets one. So the app's routes
 * are matched here instead, and everything else falls through to the asset
 * handler, which now serves 404.html with a real 404.
 *
 * A static asset that exists is served without invoking this Worker at all, so
 * this only runs for paths that would otherwise have 404ed.
 */

/** Routes declared in src/App.jsx. Keep in sync with the <Route> list. */
const SPA_ROUTES = [
  /^\/auth\/?$/,
  /^\/dashboard\/?$/,
  /^\/privacy\/?$/,
  /^\/terms\/?$/,
];

/**
 * Per-route <head> overrides for the two SPA routes meant to be indexed.
 *
 * Every SPA route is served the same shell, and that shell's head describes the
 * homepage - its <title>, its og:url, and a canonical pointing at "/". The page
 * components do correct all three, but only from a useEffect, after hydration,
 * once the lazy route chunk has loaded; and Google's own guidance is not to
 * depend on JavaScript for rel=canonical. Left alone, /terms and /privacy each
 * hand a crawler a document whose canonical names a different URL, which is the
 * textbook way to be dropped as "Alternate page with proper canonical tag" - so
 * neither page could ever be indexed on its own terms.
 *
 * Rewriting here puts the right tags in the bytes Googlebot receives, before a
 * single script runs. The useEffect stays as it is: it now writes the same
 * values that are already in the markup, and it still keeps the tab title
 * correct on a client-side navigation, where no request reaches this Worker.
 *
 * /auth and /dashboard are deliberately absent - robots.txt disallows both, so
 * their head tags are nobody's business.
 */
const ROUTE_META = {
  '/privacy': {
    title: 'Privacy Policy | TriggerX',
    description:
      'How TriggerX handles your data: what we store for price alerts, what we never collect, and how to delete your account.',
  },
  '/terms': {
    title: 'Terms of Service | TriggerX',
    description:
      'The terms covering your use of TriggerX crypto price alerts, including acceptable use, availability, and account termination.',
  },
};

/** Rewrites the shell's homepage head tags to describe `canonical` instead. */
function withRouteMeta(response, canonical, meta) {
  const setContent = (value) => ({
    element(el) {
      el.setAttribute('content', value);
    },
  });

  return (
    new HTMLRewriter()
      // Scoped to the head: an inline <svg><title> elsewhere in the shell would
      // otherwise be rewritten into the page title too.
      .on('head title', {
        element(el) {
          el.setInnerContent(meta.title);
        },
      })
      .on('link[rel="canonical"]', {
        element(el) {
          el.setAttribute('href', canonical);
        },
      })
      .on('meta[property="og:url"]', setContent(canonical))
      .on('meta[property="og:title"]', setContent(meta.title))
      .on('meta[name="twitter:title"]', setContent(meta.title))
      .on('meta[name="description"]', setContent(meta.description))
      .on('meta[property="og:description"]', setContent(meta.description))
      .on('meta[name="twitter:description"]', setContent(meta.description))
      .transform(response)
  );
}

/**
 * Runs ahead of the asset handler (assets.run_worker_first in wrangler.json). Without that, a
 * request matching a real file - "/" matches index.html - is served by the asset layer and this
 * Worker is never invoked, so the hostname check below would never run. _redirects cannot do it
 * either: Workers Assets rejects absolute source URLs ("Only relative URLs are allowed").
 *
 * The apex served the whole site at 200 alongside www, so the two were separate copies of
 * every page held together only by a canonical tag - a hint, not a directive. The sitemap and
 * robots.txt already commit to www, and the API's CORS allow-list only contains www, so a
 * visitor who typed the bare domain got a site whose every API call failed with a 403.
 *
 * Matched on the exact host. "contains" would match www.triggerx.in too and loop forever.
 */
const APEX = 'triggerx.in';
const CANONICAL_HOST = 'www.triggerx.in';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === APEX) {
      url.hostname = CANONICAL_HOST;
      // Pinned rather than inherited: a redirect is a fresh request, and sending the reader to
      // http:// would cost an extra hop even with HSTS in front.
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }

    if (SPA_ROUTES.some((route) => route.test(url.pathname))) {
      // Ask for "/" rather than "/index.html". The asset handler normalises an
      // explicit /index.html back to / with a 308, which would send the browser
      // to the homepage and lose the path - React Router would then render the
      // landing page instead of the route. Asking for the directory returns the
      // same bytes at 200 with the URL intact.
      const shell = new URL('/', url);
      const response = await env.ASSETS.fetch(new Request(shell, request));

      const meta = ROUTE_META[url.pathname.replace(/\/$/, '')];
      if (!meta || !response.ok) return response;

      // Pinned to the canonical origin rather than built from url.origin: a
      // canonical must name the one true URL however the request arrived, and
      // deriving it from the request would publish an http:// canonical to
      // anything that reached this Worker over http.
      const canonical = `https://${CANONICAL_HOST}${url.pathname.replace(/\/$/, '')}`;
      return withRouteMeta(response, canonical, meta);
    }

    // Anything else: a real asset, or 404.html with a 404.
    return env.ASSETS.fetch(request);
  },
};
