<template>
  <div v-if="variant === 'gear'" class="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-10 lg:gap-16">
    <ProductContainer class="w-full max-w-sm xl:max-w-md shrink-0 pt-10 pb-4 md:-rotate-1" bg="bg-splatoon-blue">
      <div class="skeleton-block aspect-2/1" />
      <div class="skeleton-block h-12 w-64 mx-auto -mt-6 relative" />
      <div class="skeleton-block h-6 w-52 mx-auto my-4" />
      <div class="px-4 space-y-4">
        <div v-for="n in 3" :key="n" class="gear-row rounded-lg border border-white/20">
          <div class="skeleton-block size-20 shrink-0" />
          <div class="grow space-y-3">
            <div class="skeleton-block h-3 w-16" />
            <div class="skeleton-block h-5 w-3/4" />
            <div class="skeleton-block h-6 w-24" />
          </div>
        </div>
      </div>
    </ProductContainer>

    <div class="w-full max-w-3xl lg:flex-1 min-w-0 bg-zinc-200/80 px-2 pb-24 lg:pb-36 md:rotate-1">
      <div class="skeleton-block h-8 w-64 mx-auto my-4 bg-zinc-700/20" />
      <div class="md:hidden">
        <div v-for="n in 6" :key="n" class="gear-row">
          <div class="skeleton-block size-20 shrink-0 bg-zinc-700/20" />
          <div class="skeleton-block h-16 grow bg-zinc-700/20" />
        </div>
      </div>
      <div class="hidden md:grid grid-cols-3 gap-y-12 py-6">
        <div v-for="n in 6" :key="n" class="skeleton-block aspect-[952/972] bg-zinc-700/30" />
      </div>
    </div>
  </div>

  <div v-else-if="variant === 'salmonrun'" class="flex justify-center">
    <ProductContainer class="w-full max-w-2xl pt-8 px-2 pb-2 md:-rotate-1" bg="bg-splatoon-salmonRun">
      <div class="skeleton-block h-9 w-56 mx-2 mb-2" />
      <div class="md:w-2/3 ml-auto space-y-6">
        <div class="space-y-3">
          <div class="skeleton-block h-6 w-16" />
          <div class="skeleton-block h-7 w-full" />
          <div class="skeleton-block h-6 w-48" />
          <div class="flex items-center gap-2">
            <div class="skeleton-block aspect-2/1 flex-1" />
            <div class="skeleton-block w-40 sm:w-56 h-20" />
          </div>
        </div>
        <div class="rounded-lg bg-zinc-900/60 p-2 space-y-3">
          <div class="skeleton-block h-6 w-20" />
          <div v-for="n in 4" :key="n" class="space-y-2 border-b border-dashed border-white/20 pb-3 last:border-0">
            <div class="skeleton-block h-5 w-4/5" />
            <div class="skeleton-block h-10" />
          </div>
        </div>
      </div>
    </ProductContainer>
  </div>

  <div v-else-if="variant === 'splatfests'" class="space-y-10">
    <div v-for="n in 2" :key="n" class="flex flex-wrap items-center justify-center gap-6">
      <ProductContainer class="w-full max-w-md pt-10 pb-4 md:-rotate-1" bg="bg-zinc-500">
        <div class="skeleton-block h-9 w-48 mx-2 mb-3" />
        <div class="skeleton-block h-7 w-3/4 mx-auto mb-2" />
        <div class="skeleton-block aspect-[1740/680]" />
        <div class="skeleton-block h-6 w-3/4 mx-auto my-4" />
        <div class="skeleton-block h-6 w-4/5 mx-auto" />
      </ProductContainer>
      <ProductContainer class="w-full max-w-md pt-10 px-2 pb-4 md:rotate-1" bg="bg-splatoon-purple">
        <div class="skeleton-block h-9 w-40 mb-4" />
        <div class="skeleton-block h-56" />
        <div class="skeleton-block h-6 w-48 mx-auto mt-4" />
      </ProductContainer>
    </div>
  </div>

  <div v-else :class="variant === 'challenges' ? 'flex flex-col lg:flex-row justify-center items-start gap-10 my-6' : 'flex flex-wrap justify-center gap-6'">
    <ProductContainer
      v-for="(bg, n) in variant === 'challenges' ? challengeColors : scheduleColors"
      :key="n"
      :bg="bg"
      class="w-full pt-10 pb-4"
      :class="[variant === 'challenges' ? 'max-w-xl mx-auto lg:mx-0' : 'md:max-w-md 2xl:max-w-lg', n % 2 ? 'md:rotate-1' : 'md:-rotate-1']"
    >
      <div class="flex items-center gap-2 mx-2 mb-2">
        <div class="skeleton-block size-10 shrink-0" />
        <div class="skeleton-block h-8 w-2/3" />
      </div>
      <div v-if="variant === 'challenges'" class="skeleton-block h-12 mx-2 mb-3" />
      <div class="bg-zinc-900/60 rounded-lg mx-1 p-2 pb-6 space-y-2">
        <div class="skeleton-block h-6 w-40" />
        <div class="skeleton-block aspect-4/1" />
      </div>
      <div class="skeleton-block h-7 w-20 my-3" />
      <div v-if="variant === 'challenges'" class="px-3 space-y-4">
        <div v-for="row in 6" :key="row" class="skeleton-block h-9" />
        <div class="skeleton-block h-48" />
      </div>
      <template v-else>
        <div class="mx-2 space-y-2 sm:flex sm:items-center sm:gap-1 sm:space-y-0">
          <div class="skeleton-block h-10 sm:h-20 sm:w-1/3" />
          <div class="skeleton-block aspect-4/1 sm:flex-1" />
        </div>
        <div class="skeleton-block h-8 w-44 mt-4 mx-auto rounded-full" />
      </template>
    </ProductContainer>
  </div>
</template>

<script setup>
import ProductContainer from '@/components/ProductContainer.vue';

defineProps({
  variant: { type: String, required: true },
});

const scheduleColors = ['bg-splatoon-battle-regular', 'bg-splatoon-battle-ranked', 'bg-splatoon-battle-ranked', 'bg-splatoon-battle-xmatch'];
const challengeColors = ['bg-splatoon-battle-league', 'bg-splatoon-battle-league'];
</script>

<style scoped>
@reference "@/assets/css/base.css";

@layer components {
  .skeleton-block {
    @apply rounded-md bg-white/20 motion-safe:animate-pulse;
  }

  .gear-row {
    @apply flex items-center gap-4 px-2 h-[108px];
  }
}
</style>
