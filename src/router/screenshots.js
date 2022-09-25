import { createRouter, createWebHashHistory } from 'vue-router'
import ScreenshotsHomeView from '@/views/screenshots/ScreenshotsHomeView.vue'
import CountdownView from '@/views/screenshots/CountdownView.vue'
import SchedulesView from '@/views/screenshots/SchedulesView.vue'
import RegularGearView from '@/views/screenshots/RegularGearView.vue'
import DailyDropGearView from '@/views/screenshots/DailyDropGearView.vue'
import SplatfestView from '@/views/screenshots/SplatfestView.vue'

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
    {
      path: '/gear/regular',
      component: RegularGearView,
    },
    {
      path: '/gear/dailydrop',
      component: DailyDropGearView,
    },
    {
      path: '/splatfest',
      component: SplatfestView,
    },
  ]
})

export default router
