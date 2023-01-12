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
        <router-link to="/salmonrun">Salmon Run</router-link>
      </div>
      <div>
        Gear:
        <router-link to="/gear/regular">Regular</router-link>&nbsp;
        <router-link to="/gear/dailydrop">Daily Drop</router-link>&nbsp;
        <router-link to="/gear/salmonrun">Salmon Run</router-link>
      </div>
      <div>
        <router-link to="/splatfest">Splatfest</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
a {
  @apply underline;
}
</style>
