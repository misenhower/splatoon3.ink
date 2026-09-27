<template>
  <div class="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-10 lg:gap-16">
    <ProductContainer class="w-full max-w-sm xl:max-w-md shrink-0 pt-10 pb-4 md:-rotate-1" bg="bg-splatoon-blue">
      <SkeletonBlock class="aspect-2/1" />
      <SkeletonBlock class="h-12 w-64 mx-auto -mt-6 relative" />
      <SkeletonBlock class="h-6 w-52 mx-auto my-4" />
      <div class="px-4 space-y-4">
        <div v-for="n in 3" :key="n" class="flex items-center gap-4 px-2 h-[108px] rounded-lg border border-white/20">
          <SkeletonBlock class="size-20 shrink-0" />
          <div class="grow space-y-3">
            <SkeletonBlock class="h-3 w-16" />
            <SkeletonBlock class="h-5 w-3/4" />
            <SkeletonBlock class="h-6 w-24" />
          </div>
        </div>
      </div>
    </ProductContainer>

    <div class="w-full max-w-3xl lg:flex-1 min-w-0 bg-zinc-200/80 px-2 pb-24 lg:pb-36 md:rotate-1">
      <SkeletonBlock class="h-8 w-64 mx-auto my-4 bg-zinc-700/20" />
      <div class="md:hidden">
        <div v-for="n in 6" :key="n" class="flex items-center gap-4 px-2 h-[108px]">
          <SkeletonBlock class="size-20 shrink-0 bg-zinc-700/20" />
          <SkeletonBlock class="h-16 grow bg-zinc-700/20" />
        </div>
      </div>
      <div class="hidden md:grid grid-cols-3 gap-y-12 py-6">
        <SkeletonBlock v-for="n in 6" :key="n" class="aspect-[952/972] bg-zinc-700/30" />
      </div>
    </div>
  </div>
</template>

<script setup>
import ProductContainer from '@/components/ProductContainer.vue';
import SkeletonBlock from '@/components/loading/SkeletonBlock.vue';
</script>
