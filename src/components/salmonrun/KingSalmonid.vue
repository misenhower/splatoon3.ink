<template>
  <div>
    <img
      src="@/assets/img/king-cohozuna.png"
      :class="size"
      :title="$t('salmonrun.kings.maybe-cohozuna')"
      v-if="schedule.__splatoon3ink_king_salmonid_guess === 'Cohozuna'"
      />
    <img
      src="@/assets/img/king-horrorboros.png"
      :class="size"
      :title="$t('salmonrun.kings.maybe-horrorboros')"
      v-if="schedule.__splatoon3ink_king_salmonid_guess === 'Horrorboros'"
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
