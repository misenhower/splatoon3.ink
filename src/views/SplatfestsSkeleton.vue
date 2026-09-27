<template>
  <div class="space-y-10">
    <div v-for="n in 2" :key="n" class="flex flex-wrap items-center justify-center gap-6">
      <ProductContainer class="w-full max-w-md pt-10 pb-4 md:-rotate-1" bg="bg-zinc-500">
        <SkeletonBlock class="h-9 w-48 mx-2 mb-3" />
        <SkeletonBlock class="h-7 w-3/4 mx-auto mb-2" />
        <SkeletonBlock class="aspect-[1740/680]" />
        <SkeletonBlock class="h-6 w-3/4 mx-auto my-4" />
        <SkeletonBlock class="h-6 w-4/5 mx-auto" />
      </ProductContainer>
      <ProductContainer class="w-full max-w-md pt-10 px-2 pb-4 md:rotate-1" bg="bg-splatoon-purple">
        <SkeletonBlock class="h-9 w-40 mb-4" />
        <SkeletonBlock class="h-56" />
        <SkeletonBlock class="h-6 w-48 mx-auto mt-4" />
      </ProductContainer>
    </div>
  </div>
</template>

<script setup>
import ProductContainer from '@/components/ProductContainer.vue';
import SkeletonBlock from '@/components/loading/SkeletonBlock.vue';
</script>
