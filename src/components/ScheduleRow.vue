<template>
  <div class="space-y-2">
    <div class="font-splatoon2  sm:hidden">
      <div class="flex items-center space-x-2">
        <div>
          <RuleIcon :rule="props.schedule.settings.vsRule" class="h-5" />
        </div>
        <div>
          {{ props.schedule.settings.vsRule.name }}
        </div>
      </div>
    </div>

    <div class="flex space-x-1">
      <div class="flex-1 items-center text-center font-splatoon2 hidden sm:flex">
        <div class="w-full space-y-1">
          <div class="flex items-center justify-center space-x-2">
            <div>
              <RuleIcon :rule="props.schedule.settings.vsRule" class="h-5 lg:h-6" />
            </div>
            <div class="text-xs lg:text-lg">
              {{ props.schedule.settings.vsRule.name }}
            </div>
          </div>
        </div>
      </div>

      <div class="flex-1">
        <StageImage class="flex-1" imgClass="rounded-l-xl" :stage="props.schedule.settings.vsStages[0]" />
      </div>

      <div class="flex-1">
        <StageImage class="flex-1" imgClass="rounded-r-xl" :stage="props.schedule.settings.vsStages[1]" />
      </div>
    </div>
  </div>
</template>

<script setup>
import StageImage from './StageImage.vue';
import RuleIcon from './RuleIcon.vue';

const props = defineProps({
  schedule: {
    required: true,
  },
});
</script>
