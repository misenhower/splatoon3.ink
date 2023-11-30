<template>
  <div>
    <img
      v-if="schedule.setting.boss.name === 'Cohozuna'"
      src="@/assets/img/king-cohozuna.png"
      :class="size"
      :title="$t(`splatnet.boss.${schedule.setting.boss.id}.name`, schedule.setting.boss.name)"
    />
    <img
      v-if="schedule.setting.boss.name === 'Horrorboros'"
      src="@/assets/img/king-horrorboros.png"
      :class="size"
      :title="$t(`splatnet.boss.${schedule.setting.boss.id}.name`, schedule.setting.boss.name)"
    />
    <img
      v-if="schedule.setting.boss.name === 'Megalodontia'"
      src="@/assets/img/king-megalodontia.png"
      :class="size"
      :title="$t(`splatnet.boss.${schedule.setting.boss.id}.name`, schedule.setting.boss.name)"
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
