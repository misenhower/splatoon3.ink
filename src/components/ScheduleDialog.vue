<template>
  <ModalDialog inner-class="md:-rotate-1" no-scroll>
    <div class="h-full w-full max-w-2xl isolate rounded-2xl overflow-hidden" :class="type.bg">
      <div class="relative h-full overflow-hidden">
        <div class="absolute inset-x-0 bg-zinc-800/40 backdrop-blur-md z-30 pt-10 pb-4">
          <div class="flex items-center space-x-2 mx-2">
            <img :src="type.img" />
            <div class="font-splatoon1 lg:text-2xl xl:text-3xl text-shadow">
              {{ $t(type.name) }}
            </div>
            <div v-if="type.badge" class="font-splatoon2 text-xs lg:text-sm xl:text-base bg-splatoon-blue rounded px-1 drop-shadow">
              {{ $t(type.badge) }}
            </div>
          </div>
        </div>

        <button class="text-zinc-300 bg-zinc-800/50 rounded-full p-1 absolute top-3 right-3 z-40" @click="$emit('close')">
          <span class="sr-only">Close</span>
          <XMarkIcon class="h-6 w-6" aria-hidden="true" />
        </button>

        <div class="h-full overflow-y-auto pt-24 pb-8">
          <template v-for="{ title, schedules } in sections" :key="title">
            <div class="mt-6 mx-2 space-y-2 text-left">
              <SquidTape class="font-splatoon2 text-sm drop-shadow -rotate-6 -mx-2">
                <div class="px-2">
                  {{ $t(title) }}
                </div>
              </SquidTape>

              <ScheduleRow v-for="schedule in schedules" :key="schedule.startTime" :schedule="schedule" />
            </div>
          </template>
        </div>
      </div>
    </div>
  </ModalDialog>
</template>

<script setup>
import { computed } from 'vue';
import ScheduleRow from './ScheduleRow.vue';
import SquidTape from './SquidTape.vue';
import { useScheduleTypes } from './concerns/scheduleTypes.mjs';
import ModalDialog from './ModalDialog.vue';
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
});

defineEmits(['close']);

const { types } = useScheduleTypes();

const type = computed(() => types[props.type]);
const store = computed(() => type.value.store);

const sections = computed(() => [
  {
    title: 'times.now',
    schedules: [store.value.activeSchedule],
  },
  {
    title: 'times.next',
    schedules: store.value.upcomingSchedules?.slice(0, 1),
  },
  {
    title: 'times.future',
    schedules: store.value.upcomingSchedules?.slice(1),
  },
]);
</script>

<style scoped>
.product-mask {
  mask-image: url('@/assets/img/tag-card-header.svg');
  mask-position: top;
  mask-size: 2000px auto;
  mask-repeat: no-repeat;
}

.bg-tapes {
  background-image: url('@/assets/img/tapes-transparent.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: contain;
}
</style>
