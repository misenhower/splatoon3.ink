<template>
  <div class="min-h-screen grow flex items-center justify-center">
    <div class="text-center space-y-4">
      <div><strong>Screenshots</strong></div>

      <div>
        <router-link to="/countdown">Countdown</router-link>
      </div>
      <div>
        <router-link to="/schedules">Schedules</router-link>
      </div>
      <div>
        <router-link to="/gear/regular">Gear (Regular)</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
a {
  @apply underline;
}
</style>
