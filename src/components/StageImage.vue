<template>
  <button class="block relative" @click.prevent="open = true">
    <div class="bg-zinc-700 aspect-[2/1] overflow-hidden" :class="imgClass">
      <img v-if="lowRes" :src="lowRes" />
      <div v-else class="bg-zinc-500 animate-pulse h-full" :class="imgClass">
&nbsp;
      </div>
    </div>

    <div
      v-if="!hideLabel && stage"
      class="
      absolute
      bg-zinc-900
      rounded
      bottom-0
      left-1/2
      -translate-x-1/2
      translate-y-1/2
      overflow-ellipsis
      overflow-hidden
      max-w-[85%]
      whitespace-nowrap
      font-splatoon2
      px-2
    "
      :class="textSize"
    >
      {{ $t(`splatnet.stages.${stage.id}.name`, stage.name) }}
    </div>

    <StageDialog :stage="stage" :show="open" @close="open = false" />
  </button>
</template>

<script setup>
import { computed, ref } from 'vue';
import StageDialog from './StageDialog.vue';

const props = defineProps({
  stage: Object,
  imgClass: String,
  textSize: {
    type: String,
    default: 'text-xs lg:text-sm',
  },
  hideLabel: Boolean,
});

const open = ref(false);

const lowRes = computed(() => props.stage?.thumbnailImage.url);
</script>
