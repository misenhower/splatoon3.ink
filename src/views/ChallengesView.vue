<template>
    <MainLayout :title="$t('challenges.title')">
      <div class="grow flex items-center justify-center">
        <div class="mx-4 md:mx-12 w-full space-y-10 max-w-xl">
            <ChallengeScheduleBox type="challenge" class="flex-1 md:-rotate-1" />
        </div>
      </div>
    </MainLayout>
  </template>
  
  <script setup>
  import MainLayout from '@/layouts/MainLayout.vue'
  import ChallengeScheduleBox from '@/components/challenge/ChallengeScheduleBox.vue';
  </script>
  