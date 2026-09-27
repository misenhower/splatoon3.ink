<template>
  <div class="flex flex-wrap justify-center gap-6">
    <ProductContainer
      v-for="(bg, n) in colors"
      :key="n"
      :bg="bg"
      class="w-full pt-10 pb-4 md:max-w-md 2xl:max-w-lg"
      :class="n % 2 ? 'md:rotate-1' : 'md:-rotate-1'"
    >
      <div class="flex items-center gap-2 mx-2 mb-2">
        <SkeletonBlock class="size-10 shrink-0" />
        <SkeletonBlock class="h-8 w-2/3" />
      </div>
      <div class="bg-zinc-900/60 rounded-lg mx-1 p-2 pb-6 space-y-2">
        <SkeletonBlock class="h-6 w-40" />
        <SkeletonBlock class="aspect-4/1" />
      </div>
      <SkeletonBlock class="h-7 w-20 my-3" />
      <div class="mx-2 space-y-2 sm:flex sm:items-center sm:gap-1 sm:space-y-0">
        <SkeletonBlock class="h-10 sm:h-20 sm:w-1/3" />
        <SkeletonBlock class="aspect-4/1 sm:flex-1" />
      </div>
      <SkeletonBlock class="h-8 w-44 mt-4 mx-auto rounded-full" />
    </ProductContainer>
  </div>
</template>

<script setup>
import ProductContainer from '@/components/ProductContainer.vue';
import SkeletonBlock from '@/components/loading/SkeletonBlock.vue';

const colors = ['bg-splatoon-battle-regular', 'bg-splatoon-battle-ranked', 'bg-splatoon-battle-ranked', 'bg-splatoon-battle-xmatch'];
</script>
