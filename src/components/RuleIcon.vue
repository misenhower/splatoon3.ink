<template>
  <img :src="img" class="aspect-square" />
</template>

<script setup>
import { computed } from '@vue/reactivity';

import ruleAreaSvg from '@/assets/img/rules/area.svg';
import ruleAsariSvg from '@/assets/img/rules/asari.svg';
import ruleHokoSvg from '@/assets/img/rules/hoko.svg';
import ruleRegularSvg from '@/assets/img/rules/regular.svg';
import ruleYaguraSvg from '@/assets/img/rules/yagura.svg';

const props = defineProps({
  rule: {
    required: true,
  }
});

const img = computed(() => {
  switch (props.rule?.rule) {
    // Splat Zones
    case 'AREA': return ruleAreaSvg;
    // Clam Blitz
    case 'CLAM': return ruleAsariSvg;
    // Rainmaker
    case 'GOAL': return ruleHokoSvg;
    // Tower Control
    case 'LOFT': return ruleYaguraSvg;
    // Turf War
    default: return ruleRegularSvg;
  }
});
</script>
