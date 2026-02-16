<template>
  <div class="flex flex-wrap justify-center gap-x-2 gap-y-2 font-splatoon2">
    <router-link to="/" class="router-link">
      {{ $t('schedule.title') }}
    </router-link>
    <router-link to="/salmonrun" class="router-link">
      {{ $t('salmonrun.title') }}
    </router-link>
    <router-link to="/challenges" class="router-link">
      {{ $t('events.title') }}
    </router-link>
    <router-link to="/gear" class="router-link">
      {{ $t('gear.title') }}
    </router-link>
    <router-link to="/splatfests" class="router-link">
      {{ $t('festival.title') }}
    </router-link>
  </div>
</template>

<style scoped>
@reference "@/assets/css/base.css";

.router-link {
  @apply text-zinc-300 px-4 py-1 bg-zinc-300/20 rounded-full;
}

.router-link:hover {
  @apply text-zinc-50 bg-zinc-300/30;
}
.router-link-active {
  @apply text-zinc-100 bg-splatoon-blue;
}

.router-link-active:hover {
  @apply text-white;
}
</style>
