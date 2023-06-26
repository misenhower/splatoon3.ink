<template>
  <div class="flex justify-center">
    <div v-for="(weapon, i) in props.weapons" :key="i">
      <img
        :src="weapon.image.url"
        :title="$t(`splatnet.weapons.${weapon.__splatoon3ink_id}.name`, weapon.name)"
        class="aspect-square hover:scale-[1.15] hover:z-10 transition-transform"
        :class="weaponClass"
      />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  weapons: {
    type: Object,
    required: true,
  },
  weaponClass: {
    default: 'w-10',
  },
});
</script>
