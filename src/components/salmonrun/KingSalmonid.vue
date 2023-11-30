<template>
  <div>
    <img
      v-if="boss?.name === 'Cohozuna'"
      src="@/assets/img/king-cohozuna.png"
      :class="size"
      :title="$t(`splatnet.bosses.${boss.id}.name`, boss.name)"
    />
    <img
      v-if="boss?.name === 'Horrorboros'"
      src="@/assets/img/king-horrorboros.png"
      :class="size"
      :title="$t(`splatnet.bosses.${boss.id}.name`, boss.name)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  schedule: Object,
  size: {
    default: 'w-6',
  },
})

const boss = computed(() => props.schedule.settings.boss)
</script>
