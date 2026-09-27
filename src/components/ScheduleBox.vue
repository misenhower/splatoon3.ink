<template>
  <ProductContainer
    :bg="type.bg"
    class="w-full pt-10"
    :class="loading || store.activeSchedule || nextSchedule ? 'pb-4' : 'pb-1'"
  >
    <div class="space-y-2">
      <div class="flex items-center space-x-2 mx-2">
        <img :src="type.img" width="40" height="40" />
        <div class="font-splatoon1 lg:text-2xl xl:text-3xl text-shadow">
          {{ $t(type.name) }}
        </div>
        <div v-if="type.badge" class="font-splatoon2 text-xs lg:text-sm xl:text-base bg-splatoon-blue rounded-sm px-1 drop-shadow-sm">
          {{ $t(type.badge) }}
        </div>
      </div>

      <div v-if="loading || store.activeSchedule?.settings" class="bg-zinc-900/70 backdrop-blur-xs pt-2 pb-6 px-2 mx-1 rounded-lg space-y-2">
        <div class="flex items-center justify-between font-splatoon2">
          <SkeletonBlock v-if="loading" class="h-5 lg:h-7 w-32" />
          <div v-else class="flex items-center space-x-2 text-sm lg:text-lg">
            <div>
              <RuleIcon :rule="store.activeSchedule.settings.vsRule" class="h-5 lg:h-6 drop-shadow-ruleIcon" />
            </div>
            <div class="text-shadow">
              {{ $t(`splatnet.rules.${store.activeSchedule.settings.vsRule.id}.name`, store.activeSchedule.settings.vsRule.name) }}
            </div>
          </div>

          <div v-if="!loading && store.activeSchedule" class="justify-end text-xs lg:text-sm bg-zinc-100/80 rounded-sm text-black px-2">
            {{ $d(store.activeSchedule.startTime, 'time') }}
            &ndash;
            {{ $d(store.activeSchedule.endTime, 'time') }}
          </div>
        </div>

        <div class="flex space-x-1">
          <StageImage
            class="flex-1"
            :loading="loading"
            img-class="rounded-l-xl"
            :stage="store.activeSchedule?.settings?.vsStages[0]"
          />
          <StageImage
            class="flex-1"
            :loading="loading"
            img-class="rounded-r-xl"
            :stage="store.activeSchedule?.settings?.vsStages[1]"
          />
        </div>
      </div>

      <p v-else class="bg-zinc-900/70 mx-1 rounded-lg py-12 text-center font-splatoon2">
        {{ $t('times.checkback') }}
      </p>

      <div v-if="loading || nextSchedule?.settings" class="mx-2 space-y-2">
        <SquidTape class="font-splatoon2 text-sm drop-shadow-sm -rotate-6 -mx-2">
          <div class="px-2">
            {{ $t('times.next') }}
          </div>
        </SquidTape>

        <ScheduleRow :schedule="nextSchedule" :loading="loading" />
      </div>

      <div v-if="loading || store.activeSchedule || nextSchedule" class="text-center pt-2">
        <button :disabled="loading" class="bg-zinc-300/50 enabled:hover:bg-zinc-300/70 px-2 py-1 rounded-full font-splatoon2 text-shadow" @click="open = true">
          <span class="inline-block rotate-25 text-red">&#57445;</span>
          {{ $t('schedule.all-upcoming') }}
        </button>
      </div>
    </div>

    <ScheduleDialog :type="props.type" :show="open && !loading" @close="open = false" />
  </ProductContainer>
</template>

<script setup>
import { computed, ref } from 'vue';
import ProductContainer from './ProductContainer.vue';
import SkeletonBlock from './loading/SkeletonBlock.vue';
import StageImage from './StageImage.vue';
import ScheduleRow from './ScheduleRow.vue';
import RuleIcon from './RuleIcon.vue';
import SquidTape from './SquidTape.vue';
import { useScheduleTypes } from './concerns/scheduleTypes.mjs';
import ScheduleDialog from './ScheduleDialog.vue';

const props = defineProps({
  loading: Boolean,
  type: {
    type: String,
    required: true,
  },
});

const { types } = useScheduleTypes();

const type = computed(() => types[props.type]);
const store = computed(() => type.value.store);
const nextSchedule = computed(() => store.value.upcomingSchedules?.[0]);

const open = ref(false);
</script>

<style scoped>
:deep(.bg-tapes) {
  background-image: url('@/assets/img/tapes-transparent.png'),
    linear-gradient(180deg, rgba(2, 0, 36, 0.10) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.25) 100%);
  background-size: contain;
}
</style>
