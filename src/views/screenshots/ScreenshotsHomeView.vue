<template>
  <div class="min-h-screen grow flex items-center justify-center">
    <div class="text-center space-y-4">
      <div><strong>Screenshots</strong></div>

      <div>
        <router-link to="/countdown">
          Countdown
        </router-link>
      </div>
      <div>
        <router-link to="/schedules">
          Schedules
        </router-link>
      </div>
      <div>
        <router-link to="/challenges">
          Challenges
        </router-link>
      </div>
      <div>
        <router-link to="/salmonrun">
          Salmon Run
        </router-link>
      </div>
      <div>
        Gear:
        <router-link to="/gear/regular">
          Regular
        </router-link>&nbsp;
        <router-link to="/gear/dailydrop">
          Daily Drop
        </router-link>&nbsp;
        <router-link to="/gear/salmonrun">
          Salmon Run
        </router-link>
      </div>
      <div>
        Splatfest:
        <router-link to="/splatfest/NA">
          NA
        </router-link>&nbsp;
        <router-link to="/splatfest/EU">
          EU
        </router-link>&nbsp;
        <router-link to="/splatfest/JP">
          JP
        </router-link>&nbsp;
        <router-link to="/splatfest/AP">
          AP
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "@/assets/css/base.css";

a {
  @apply underline;
}
</style>
