import { createRouter, createWebHistory } from 'vue-router';
import DataPage from './pages/DataPage.vue';
import SocialPage from './pages/SocialPage.vue';
import TimelinePage from './pages/TimelinePage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'timeline', component: TimelinePage, meta: { title: 'Timeline' } },
    { path: '/social', name: 'social', component: SocialPage, meta: { title: 'Social' } },
    { path: '/data', name: 'data', component: DataPage, meta: { title: 'Data' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
