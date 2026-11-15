<template>
  <button
    type="button"
    role="switch"
    :aria-checked="on"
    :disabled="disabled"
    class="inline-flex min-h-10 items-center gap-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-45"
    @click="emit('toggle', !on)"
  >
    <span
      class="inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors"
      :class="on ? 'border-transparent bg-accent' : 'border-line bg-raised'"
      aria-hidden="true"
    >
      <span
        class="size-4.5 rounded-full transition-transform"
        :class="on ? 'translate-x-4.5 bg-accent-ink' : 'translate-x-0.5 bg-muted'"
      />
    </span>
    <slot />
  </button>
</template>

<script setup>
// An on/off switch. It shows `on` as given and emits `toggle` with the new value; the owner
// changes `on` once the change has gone through.
defineProps({
  on: { type: Boolean, required: true },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle']);
</script>
