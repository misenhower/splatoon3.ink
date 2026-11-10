<template>
  <button
    type="button"
    class="btn"
    :class="armed ? 'btn-armed' : variant === 'primary' ? 'btn-primary' : ''"
    :disabled="disabled"
    @click="click"
    @blur="disarm"
  >
    <template v-if="armed">
      {{ confirmLabel }}
    </template>
    <slot v-else />
  </button>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue';

// A button that asks once more before acting: the first press arms it for a few seconds and
// changes its label; the second press confirms.
const props = defineProps({
  confirmLabel: { type: String, default: 'Press again to confirm' },
  confirm: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  variant: { type: String, default: 'default' },
});

const emit = defineEmits(['confirmed']);

const armed = ref(false);
let timer = null;

function disarm() {
  armed.value = false;
  clearTimeout(timer);
}

function click() {
  if (!props.confirm || armed.value) {
    disarm();
    emit('confirmed');

    return;
  }

  armed.value = true;
  timer = setTimeout(disarm, 5000);
}

onBeforeUnmount(disarm);
</script>
