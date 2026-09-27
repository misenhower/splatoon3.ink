// Build tools can read route metadata without importing Vue components.
export function createRoutes(views = {}) {
  return [
    {
      path: '/',
      name: 'home',
      component: views.HomeView,
    },
    {
      path: '/salmonrun',
      name: 'salmonrun',
      component: views.SalmonRunView,
    },
    {
      path: '/gear',
      name: 'gear',
      component: views.GearView,
    },
    {
      path: '/splatfests',
      name: 'splatfests',
      component: views.SplatfestsView,
    },
    {
      path: '/challenges',
      name: 'challenges',
      component: views.ChallengesView,
    },
    {
      path: '/socials',
      name: 'socials',
      component: views.SocialsView,
    },
    {
      path: '/about',
      name: 'about',
      component: views.AboutView,
    },
    {
      path: '/faq',
      redirect: { name: 'about' },
    },
  ];
}
