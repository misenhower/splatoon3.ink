<template>
  <MainLayout>
    <div class="grow flex items-center justify-center">
      <div class="w-full max-w-2xl mt-20 mb-20 mx-4">
        <div class="relative">
          <Splat6 class="absolute -bottom-32 -left-24 w-64" fill="fill-splatoon-orange" />
          <Splat3 class="absolute -right-28 -top-24 w-64" fill="fill-splatoon-orange" />

          <div class="relative z-0 md:-rotate-1">
            <ProductContainer class="py-12 bg-octoarrow">
              <div class="faq text-zinc-200 px-10">
                <div class="space-y-6">
                  <h1 class="font-splatoon2 text-shadow">
                    Social Media
                  </h1>

                  <div>
                    {{ $t('social.description') }}
                  </div>

                  <div>
                    <ul class="list-disc ml-4">
                      <li v-for="social in displaySocials" :key="social.title">
                        <strong>{{ social.title }}:</strong> <a :href="social.url" target="_blank">{{ social.handle }}</a>
                        <i18n-t v-if="social.alternate" keypath="social.alternateAccount" tag="span" class="ml-1">
                          <template #account>
                            <a :href="social.alternate.url" target="_blank">{{ social.alternate.handle }}</a>
                          </template>
                        </i18n-t>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <router-link to="/">
                      &laquo; {{ $t('about.schedules') }}
                    </router-link>
                  </div>
                </div>
              </div>
            </ProductContainer>

            <img class="absolute hidden sm:block -top-6 right-36 w-32 -rotate-3" src="@/assets/img/tape/tape-2.png" />
            <img
              class="absolute hidden sm:block top-20 -left-16 w-20 rotate-3"
              src="@/assets/img/stickers/sticker-2-red.png"
            />
            <img class="absolute -bottom-4 -right-12 w-32 -rotate-6" src="@/assets/img/stickers/sticker-1.png" />
            <img
              class="absolute hidden sm:block -bottom-4 left-40 w-60 rotate-3"
              src="@/assets/img/stickers/sticker-8.png"
            />
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Splat3 from '@/components/splats/Splat3.vue';
import Splat6 from '@/components/splats/Splat6.vue';
import MainLayout from '@/layouts/MainLayout.vue';
import ProductContainer from '@/components/ProductContainer.vue';

const { locale } = useI18n();

const socials = [
  {
    title: 'Twitter',
    handle: '@Splatoon3ink',
    url: 'https://twitter.com/splatoon3ink',
    japanese: {
      handle: '@Splatoon3inkJP',
      url: 'https://twitter.com/Splatoon3inkJP',
    },
  },
  {
    title: 'Bluesky',
    handle: '@splatoon3.ink',
    url: 'https://bsky.app/profile/splatoon3.ink',
    japanese: {
      handle: '@jp.splatoon3.ink',
      url: 'https://bsky.app/profile/jp.splatoon3.ink',
    },
  },
  {
    title: 'Fediverse (Mastodon)',
    handle: '@splatoon3ink@splatoon3.ink',
    url: 'https://splatoon3.ink/@splatoon3ink',
  },
  {
    title: 'Threads',
    handle: '@splatoon3ink',
    url: 'https://threads.net/@splatoon3ink',
  },
];

const displaySocials = computed(() => {
  const japanese = locale.value === 'ja-JP';

  return socials.map(social => {
    if (!social.japanese) return social;

    return {
      title: social.title,
      ...(japanese ? social.japanese : social),
      alternate: japanese ? social : social.japanese,
    };
  });
});
</script>

<style scoped>
@reference "@/assets/css/base.css";

.bg-octoarrow {
  background-image: url('@/assets/img/camo-transparent-bg.png');
  background-size: 800px;
  background-position: 75px 50px;
}

.faq h1 {
  @apply text-zinc-50 text-3xl font-bold mb-2;
}

.faq h2 {
  @apply text-zinc-100 text-xl font-semibold mb-1;
}

.faq p {
  @apply mb-2;
}

.faq a {
  @apply underline;
}
</style>
