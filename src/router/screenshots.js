import { createRouter, createWebHashHistory } from 'vue-router'
import ScreenshotsHomeView from '@/views/screenshots/ScreenshotsHomeView.vue'
import CountdownView from '@/views/screenshots/CountdownView.vue'
import SchedulesView from '@/views/screenshots/SchedulesView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL + 'screenshots/'),
  routes: [
    {
      path: '/',
      component: ScreenshotsHomeView,
    },
    {
      path: '/countdown',
      component: CountdownView,
    },
    {
      path: '/schedules',
      component: SchedulesView,
    },
  ]
})

export default router
