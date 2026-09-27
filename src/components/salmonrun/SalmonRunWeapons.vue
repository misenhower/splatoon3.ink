<template>
  <div class="flex justify-center">
    <div v-for="(weapon, i) in loading ? Array(4).fill(null) : props.weapons" :key="i">
      <SkeletonBlock v-if="loading" class="aspect-square" :class="weaponClass" />
      <img
        v-else
        :src="weapon.image.url"
        :title="$t(`splatnet.weapons.${weapon.__splatoon3ink_id}.name`, weapon.name)"
        class="aspect-square hover:scale-[1.15] hover:z-10 transition-transform"
        :class="weaponClass"
      />
    </div>
  </div>
</template>

<script setup>
import SkeletonBlock from '@/components/loading/SkeletonBlock.vue';

const props = defineProps({
  weapons: Array,
  loading: Boolean,
  weaponClass: {
    type: String,
    default: 'w-10',
  },
});
</script>
