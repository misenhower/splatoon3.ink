// Build tools can read route metadata without importing Vue components.
export function createRoutes(views = {}) {
  return [
    {
      path: '/',
      name: 'home',
      component: views.HomeView,
      meta: { titleKey: 'schedule.title' },
    },
    {
      path: '/salmonrun',
      name: 'salmonrun',
      component: views.SalmonRunView,
      meta: { titleKey: 'salmonrun.title' },
    },
    {
      path: '/gear',
      name: 'gear',
      component: views.GearView,
      meta: { titleKey: 'gear.title' },
    },
    {
      path: '/splatfests',
      name: 'splatfests',
      component: views.SplatfestsView,
      meta: { titleKey: 'festival.title' },
    },
    {
      path: '/challenges',
      name: 'challenges',
      component: views.ChallengesView,
      meta: { titleKey: 'events.title' },
    },
    {
      path: '/socials',
      name: 'socials',
      component: views.SocialsView,
      meta: { titleKey: 'footer.socials' },
    },
    {
      path: '/about',
      name: 'about',
      component: views.AboutView,
      meta: { titleKey: 'footer.about' },
    },
    {
      path: '/faq',
      redirect: { name: 'about' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: views.NotFoundView,
      meta: { title: '404' },
    },
  ];
}
