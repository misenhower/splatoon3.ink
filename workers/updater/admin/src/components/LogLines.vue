<template>
  <div class="overflow-auto rounded-lg bg-ground px-3 py-1.5 font-mono text-[13px] leading-relaxed">
    <component
      :is="line.runKey ? 'button' : 'div'"
      v-for="(line, index) in lines"
      :key="index"
      :type="line.runKey ? 'button' : undefined"
      class="grid w-full gap-3 border-b border-panel py-1 text-left last:border-b-0"
      :class="[
        showSource ? 'grid-cols-[auto_3rem_3rem_1fr]' : 'grid-cols-[auto_3rem_1fr]',
        line.runKey ? 'hover:bg-panel' : '',
        line.runKey && line.runKey === selectedKey ? 'bg-panel' : '',
      ]"
      @click="line.runKey && emit('select', line.runKey)"
    >
      <span class="text-muted">{{ clock.when(line.at) }}</span>
      <span v-if="showSource" class="text-muted">{{ line.source }}</span>
      <span :class="levels[line.level] ?? 'text-muted'">{{ line.level }}</span>
      <span class="min-w-0 break-words whitespace-pre-wrap" :class="line.level === 'error' ? 'text-bad' : line.level === 'debug' ? 'text-muted' : ''">{{ line.text }}</span>
    </component>
  </div>
</template>

<script setup>
import { clock } from '../clock.js';

defineProps({
  // { at, level, text, source?, runKey? }; a line with a runKey selects that run when pressed.
  lines: { type: Array, required: true },
  showSource: { type: Boolean, default: false },
  selectedKey: { type: String, default: null },
});

const emit = defineEmits(['select']);

const levels = {
  error: 'font-medium text-bad',
  warn: 'font-medium text-warn',
  info: 'text-muted',
  debug: 'text-muted/70',
};
</script>
