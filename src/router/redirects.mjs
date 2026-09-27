// Only known page routes receive the SPA shell; other paths use Pages' 404.html.
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
