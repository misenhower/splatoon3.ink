<template>
  <div>
<div>
  <div class="mt-6" aria-hidden="true">
    <div class="text-center">
      releases in 123 days!
    </div>
    <div class="bg-blue-pattern rounded-full overflow-hidden my-4">
      <div class="h-10 bg-yellow-pattern rounded-full" style="width: 75%"></div>
    </div>
    <div class="grid grid-cols-2 text-sm font-medium">
      <div class="text-splatoon-yellow">Announced</div>
      <div class="text-splatoon-blue text-right">Released</div>
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
