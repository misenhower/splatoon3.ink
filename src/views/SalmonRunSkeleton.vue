<template>
  <div class="flex justify-center">
    <ProductContainer class="w-full max-w-2xl pt-8 px-2 pb-2 md:-rotate-1" bg="bg-splatoon-salmonRun">
      <SkeletonBlock class="h-9 w-56 mx-2 mb-2" />
      <div class="md:w-2/3 ml-auto space-y-6">
        <div class="space-y-3">
          <SkeletonBlock class="h-6 w-16" />
          <SkeletonBlock class="h-7 w-full" />
          <SkeletonBlock class="h-6 w-48" />
          <div class="flex items-center gap-2">
            <SkeletonBlock class="aspect-2/1 flex-1" />
            <SkeletonBlock class="w-40 sm:w-56 h-20" />
          </div>
        </div>
        <div class="rounded-lg bg-zinc-900/60 p-2 space-y-3">
          <SkeletonBlock class="h-6 w-20" />
          <div v-for="n in 4" :key="n" class="space-y-2 border-b border-dashed border-white/20 pb-3 last:border-0">
            <SkeletonBlock class="h-5 w-4/5" />
            <SkeletonBlock class="h-10" />
          </div>
        </div>
      </div>
    </ProductContainer>
  </div>
</template>

<script setup>
import ProductContainer from '@/components/ProductContainer.vue';
import SkeletonBlock from '@/components/loading/SkeletonBlock.vue';
</script>
