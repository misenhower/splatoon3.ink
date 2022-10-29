<template>
  <TransitionRoot as="template" :show="show" >
    <Dialog as="div" class="relative z-20">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
        leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-zinc-900/80 transition-opacity backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 z-20 overflow-y-auto">
        <div class="flex min-h-full justify-center p-4 text-center items-center">
          <TransitionChild as="template" enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-0 scale-95"
            enter-to="opacity-100 translate-y-0 scale-100" leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 scale-100"
            leave-to="opacity-0 translate-y-0 scale-95">
            <DialogPanel :class="innerClass">
              <slot />
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'

defineProps({
  show: {
    type: Boolean,
    default: true,
  },
  innerClass: String,
});
</script>
