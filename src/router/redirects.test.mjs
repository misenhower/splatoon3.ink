import { describe, expect, it } from 'vitest';
import { createRoutes } from './routes.mjs';
import { createRedirects } from './redirects.mjs';

describe('Pages route rewrites', () => {
  it('serves known routes and their trailing-slash forms without a catch-all rewrite', () => {
    const rules = createRedirects(createRoutes()).trim().split('\n');

    expect(rules).toContain('/gear / 200');
    expect(rules).toContain('/gear/ /gear 301');
    expect(rules.some(rule => /[:*]/.test(rule))).toBe(false);
    expect(rules.some(rule => rule.startsWith('/screenshots'))).toBe(false);
  });

  it('resolves the FAQ redirect from the named router destination', () => {
    const routes = createRoutes();
    routes.find(route => route.name === 'about').path = '/about-us';

    expect(createRedirects(routes)).toContain('/faq /about-us 301\n');
    expect(createRedirects(routes)).toContain('/faq/ /about-us 301\n');
  });

  it('automatically includes new static pages', () => {
    const routes = [...createRoutes(), { path: '/new-page', name: 'new-page' }];

    expect(createRedirects(routes)).toContain('/new-page / 200\n');
  });

  it('fails the build for an unresolved named redirect', () => {
    expect(() => createRedirects([
      { path: '/old', redirect: { name: 'missing' } },
    ])).toThrow('Unknown redirect target for /old');
  });
});
