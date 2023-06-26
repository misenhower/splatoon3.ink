<template>
  <div>
    <img
      v-if="schedule.__splatoon3ink_king_salmonid_guess === 'Cohozuna'"
      src="@/assets/img/king-cohozuna.png"
      :class="size"
      :title="$t('salmonrun.kings.maybe-cohozuna')"
    />
    <img
      v-if="schedule.__splatoon3ink_king_salmonid_guess === 'Horrorboros'"
      src="@/assets/img/king-horrorboros.png"
      :class="size"
      :title="$t('salmonrun.kings.maybe-horrorboros')"
    />
  </div>
</template>

<script setup>
defineProps({
  schedule: Object,
  size: {
    default: 'w-6',
  },
})
</script>
