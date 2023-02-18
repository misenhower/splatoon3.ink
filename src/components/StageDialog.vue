<template>
  <ModalDialog inner-class="-rotate-1 relative">
    <div class="bg-zinc-100 p-2">
      <button class="text-zinc-300 bg-zinc-600/50 rounded-full p-1 absolute top-3 right-3" @click="$emit('close')">
        <span class="sr-only">Close</span>
        <XMarkIcon class="h-4 w-4" aria-hidden="true" />
      </button>
      <img :src="imgUrl" v-if="imgUrl" />
    </div>

    <div class="absolute -top-8 w-full text-center">
      <img class="w-56 -rotate-1 inline-block" src="@/assets/img/tape/tape-1.png" />
    </div>

    <div class="absolute -bottom-6 w-full text-center rotate-2">
      <img class="w-80 inline-block" src="@/assets/img/stickers/sticker-12.png" />
      <div class="absolute inset-0 flex items-center justify-center text-black font-splatoon2">
        {{ $t(`splatnet.stages.${stage.id}.name`, stage.name) }}
      </div>
    </div>
  </ModalDialog>
</template>

<script setup>
import { computed } from 'vue';
import ModalDialog from './ModalDialog.vue';
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  stage: Object,
});

const imgUrl = computed(() => props.stage?.image.url);
</script>
