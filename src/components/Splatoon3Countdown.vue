<template>
  <div>
<div>
  <div class="mt-6 font-splatoon2" aria-hidden="true">
    <div class="font-splatoon2 text-center space-y-2">
      <div class="text-gray-300">releases in</div>
      <div class="text-gray-100 text-2xl">123 days!</div>
    </div>
    <div class="bg-blue-pattern rounded-full overflow-hidden my-4">
      <div class="h-10 bg-yellow-pattern rounded-full" style="width: 75%"></div>
    </div>
    <div class="flex justify-between text-sm font-medium">
      <div class="text-splatoon-yellow -rotate-3">Announced</div>
      <div class="text-splatoon-blue text-right rotate-3">Released</div>
    </div>
  </div>
</div>

  </div>
</template>

<style scoped>
.bg-blue-pattern {
  @apply bg-splatoon-blue;
  background-image: url("@/assets/battle-bg-pattern-blue.jpg");
  background-size: 190px;
}

.bg-yellow-pattern {
  @apply bg-splatoon-yellow;
  background-image: url("@/assets/battle-bg-pattern-yellow.jpg");
  background-size: 190px;
}
</style>
