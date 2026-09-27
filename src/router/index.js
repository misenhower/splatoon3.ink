import { createRouter, createWebHistory } from 'vue-router';
import { createRoutes } from './routes.mjs';
import HomeView from '@/views/HomeView.vue';
import SalmonRunView from '@/views/SalmonRunView.vue';
import GearView from '@/views/GearView.vue';
import AboutView from '@/views/AboutView.vue';
import SplatfestsView from '@/views/SplatfestsView.vue';
import ChallengesView from '@/views/ChallengesView.vue';
import SocialsView from '@/views/SocialsView.vue';
import NotFoundView from '@/views/NotFoundView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: createRoutes({
    HomeView,
    SalmonRunView,
    GearView,
    SplatfestsView,
    ChallengesView,
    SocialsView,
    AboutView,
    NotFoundView,
  }),
});

export default router;
