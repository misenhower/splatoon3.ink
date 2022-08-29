import { createRouter, createWebHistory } from 'vue-router'
import ScreenshotsHomeView from '@/views/screenshots/ScreenshotsHomeView.vue'
import CountdownView from '@/views/screenshots/CountdownView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL + 'screenshots/'),
  routes: [
    {
      path: '/',
      component: ScreenshotsHomeView,
    },
    {
      path: '/countdown',
      component: CountdownView,
    },
  ]
})

export default router
