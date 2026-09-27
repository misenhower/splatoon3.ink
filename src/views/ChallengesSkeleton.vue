<template>
  <div class="flex flex-col lg:flex-row justify-center items-start gap-10 my-6">
    <ProductContainer
      v-for="n in 2"
      :key="n"
      bg="bg-splatoon-battle-league"
      class="w-full pt-10 pb-4 max-w-xl mx-auto lg:mx-0"
      :class="n % 2 ? 'md:-rotate-1' : 'md:rotate-1'"
    >
      <div class="flex items-center gap-2 mx-2 mb-2">
        <SkeletonBlock class="size-10 shrink-0" />
        <SkeletonBlock class="h-8 w-2/3" />
      </div>
      <SkeletonBlock class="h-12 mx-2 mb-3" />
      <div class="bg-zinc-900/60 rounded-lg mx-1 p-2 pb-6 space-y-2">
        <SkeletonBlock class="h-6 w-40" />
        <SkeletonBlock class="aspect-4/1" />
      </div>
      <SkeletonBlock class="h-7 w-20 my-3" />
      <div class="px-3 space-y-4">
        <SkeletonBlock v-for="row in 6" :key="row" class="h-9" />
        <SkeletonBlock class="h-48" />
      </div>
    </ProductContainer>
  </div>
</template>

<script setup>
import ProductContainer from '@/components/ProductContainer.vue';
import SkeletonBlock from '@/components/loading/SkeletonBlock.vue';
</script>
