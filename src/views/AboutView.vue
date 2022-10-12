<template>
  <MainLayout>
    <div class="grow flex items-center justify-center">
      <div class="w-full max-w-2xl mt-20 mb-20 mx-4">
        <div class="relative">
          <Splat2 class="absolute -top-32 -left-24 w-64" />
          <Splat5 class="absolute -right-28 -bottom-24 w-64" />

          <div class="relative md:rotate-1">
            <ProductContainer class="py-12 bg-octoarrow">
              <div class="faq text-zinc-300 px-10">
                <div class="space-y-6">
                  <h1 class="font-splatoon2">{{ $t('about.title') }}</h1>

                  <div>
                    <h2>{{ $t('about.subtitle-1') }}</h2>
                    <i18n-t keypath="about.text-1" tag="p">
                      <a href="https://splatoon2.ink" target="_blank">Splatoon2.ink</a>
                    </i18n-t>
                  </div>

                  <div>
                    <h2>{{ $t('about.subtitle-2') }}</h2>
                    <i18n-t keypath="about.text-2" tag="p">
                      <a href="https://vuejs.org/" target="_blank">Vue 3</a>
                      <a href="https://pinia.vuejs.org/" target="_blank">Pinia</a>
                      <a href="https://tailwindcss.com/" target="_blank">Tailwind CSS</a>
                      <a href="https://vitejs.dev/" target="_blank">Vite</a>
                    </i18n-t>

                    <i18n-t keypath="about.text-3" tag="p">
                      <a href="https://nodejs.org/" target="_blank">NodeJS</a>
                      <a href="https://github.com/samuelthomas2774/nxapi" target="_blank">nxapi</a>
                      <a href="https://github.com/imink-app/f-API" target="_blank">imink</a>
                    </i18n-t>

                    <i18n-t keypath="about.text-4" tag="p">
                      <a href="https://twitter.com/splatoon3ink/" target="_blank">@Splatoon3ink</a>
                      <a href="https://pptr.dev/" target="_blank">Puppeteer</a>
                    </i18n-t>

                    <i18n-t keypath="about.text-5" tag="p">
                      <a href="https://github.com/misenhower/splatoon3.ink/" target="_blank">GitHub</a>.
                    </i18n-t>
                  </div>

                  <div>
                    <h2>{{ $t('about.subtitle-3') }}</h2>

                    <p>{{ $t('about.text-6') }}</p>

                    <i18n-t keypath="about.text-7" tag="p">
                      <a href="https://github.com/misenhower/splatoon3.ink/wiki/Data-Access" target="_blank">Data Access</a>
                    </i18n-t>
                  </div>

                  <div>
                    <h2>{{ $t('about.subtitle-4') }}</h2>
                    <i18n-t keypath="about.text-8" tag="p">
                      <a href="https://twitter.com/splatoon3ink" target="_blank">@Splatoon3ink</a>
                      <a href="mailto:matt@isenhower.com" target="_blank">{{ $t('about.email') }}</a>
                    </i18n-t>
                  </div>

                  <div>
                    <router-link to="/">&laquo; {{ $t('about.schedules') }}</router-link>
                  </div>
                </div>
              </div>
            </ProductContainer>

            <img class="absolute hidden sm:block -top-6 right-14 w-48 -rotate-3" src="@/assets/img/tape/tape-1.png" />
            <img class="absolute -bottom-10 left-8 w-44 rotate-6" src="@/assets/img/tape/tape-3.png" />
            <img class="absolute top-40 -right-24 w-32 rotate-6" src="@/assets/img/stickers/sticker-4.png" />
            <img class="absolute hidden sm:block -bottom-6 right-32 w-44 -rotate-3" src="@/assets/img/stickers/sticker-10.png" />
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import MainLayout from '@/layouts/MainLayout.vue'
import ProductContainer from '@/components/ProductContainer.vue'
import Splat2 from '../components/splats/Splat2.vue';
import Splat5 from '../components/splats/Splat5.vue';
</script>

<style scoped>
.bg-octoarrow {
  background-image: url('@/assets/img/octoarrow-transparent.png');
  background-size: 200px;
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
