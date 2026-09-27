// Generate Cloudflare Pages' _redirects file from the Vue router at build time.
// A top-level 404.html disables Pages' automatic SPA fallback, so known page
// URLs need explicit 200 rewrites to the root HTML entry for direct visits and
// refreshes. Vue Router then renders the page for the original URL.
//
// Named redirects (such as /faq to /about) and trailing-slash URLs use 301s.
// The root is served normally; parameterized and catch-all routes are excluded
// so unknown paths reach 404.html with a real 404 status. New static routes are
// included automatically, keeping the hosting rules in sync with the router.
export function createRedirects(routes) {
  return routes
    .filter(route => route.path !== '/' && !/[:*]/.test(route.path))
    .flatMap(route => {
      let destination = '/';
      let status = 200;

      if (route.redirect) {
        destination = routes.find(target => target.name === route.redirect.name)?.path;
        status = 301;

        if (!destination) {
          throw new Error(`Unknown redirect target for ${route.path}`);
        }
      }

      return [
        `${route.path} ${destination} ${status}`,
        `${route.path}/ ${route.redirect ? destination : route.path} 301`,
      ];
    })
    .join('\n') + '\n';
}
