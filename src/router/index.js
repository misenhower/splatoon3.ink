import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import GearView from '../views/GearView.vue'
import AboutView from '../views/AboutView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/gear',
      name: 'gear',
      component: GearView,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView
    },
    {
      path: '/faq',
      redirect: { name: 'about' },
    },
  ]
})

export default router
