import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import SalmonRunView from '@/views/SalmonRunView.vue';
import GearView from '@/views/GearView.vue';
import AboutView from '@/views/AboutView.vue';
import SplatfestsView from '@/views/SplatfestsView.vue';
import ChallengesView from '@/views/ChallengesView.vue';
import SocialsView from '@/views/SocialsView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/salmonrun',
      name: 'salmonrun',
      component: SalmonRunView,
    },
    {
      path: '/gear',
      name: 'gear',
      component: GearView,
    },
    {
      path: '/splatfests',
      name: 'splatfests',
      component: SplatfestsView,
    },
    {
      path: '/challenges',
      name: 'challenges',
      component: ChallengesView,
    },
    {
      path: '/socials',
      name: 'socials',
      component: SocialsView,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
    },
    {
      path: '/faq',
      redirect: { name: 'about' },
    },
  ],
});

export default router;
