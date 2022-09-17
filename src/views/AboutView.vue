<template>
  <MainLayout>
    <div class="grow flex items-center justify-center">
      <div class="w-full max-w-2xl mt-20 mb-20 mx-4">
        <div class="relative">
          <Splat2 class="absolute -top-32 -left-24 w-64" />
          <Splat5 class="absolute -right-28 -bottom-24 w-64" />

          <div class="relative md:rotate-1">
            <ProductContainer class="py-12 bg-octoarrow">
              <div class="faq text-gray-300 px-10">
                <div class="space-y-6">
                  <h1 class="font-splatoon2">About!</h1>

                  <div>
                    <h2>What is this?</h2>
                    <p>
                      This site is a fan-made, unofficial source of information for Nintendo's Splatoon 3.
                      You might remember me from <a href="https://splatoon2.ink" target="_blank">Splatoon2.ink</a>!
                    </p>
                  </div>

                  <div>
                    <h2>How was this site made?</h2>
                    <p>
                      On the front end, this site was built with
                      <a href="https://vuejs.org/" target="_blank">Vue 3</a>,
                      <a href="https://pinia.vuejs.org/" target="_blank">Pinia</a>, and
                      <a href="https://tailwindcss.com/" target="_blank">Tailwind CSS</a>.

                      Static assets are compiled using
                      <a href="https://vitejs.dev/" target="_blank">Vite</a>.
                    </p>

                    <p>
                      On the back end, the data updaters and Twitter bot were written using
                      <a href="https://nodejs.org/" target="_blank">NodeJS</a>.

                      Special thanks to the
                      <a href="https://github.com/samuelthomas2774/nxapi" target="_blank">nxapi</a>
                      and
                      <a href="https://github.com/imink-app/f-API" target="_blank">imink</a>
                      projects for their work to make automated Nintendo Switch Online logins possible.
                    </p>

                    <p>
                      The Twitter bot at
                      <a href="https://twitter.com/splatoon3ink/" target="_blank">@Splatoon3ink</a>
                      uses
                      <a href="https://pptr.dev/" target="_blank">Puppeteer</a>
                      to automatically generate images for each tweet.
                    </p>

                    <p>
                      This site is compltely open source.
                      You can view the source here on
                      <a href="https://github.com/misenhower/splatoon3.ink/" target="_blank">GitHub</a>.
                    </p>
                  </div>

                  <div>
                    <h2>Can I use data from this site in my own project?</h2>

                    <p>
                      Yes! I love seeing all the creative projects people come up with that use this site's data.
                    </p>

                    <p>
                      Please see the
                      <a href="https://github.com/misenhower/splatoon3.ink/wiki/Data-Access" target="_blank">Data Access</a>
                      page for a list of all available endpoints.
                    </p>
                  </div>

                  <div>
                    <h2>How can I reach you?</h2>
                    <p>
                      Please feel free to contact me on Twitter at <a href="https://twitter.com/splatoon3ink"
                      target="_blank">@Splatoon3ink</a> or via <a href="mailto:matt@isenhower.com"
                      target="_blank">email</a> if you have any other
                      questions!
                    </p>
                  </div>

                  <div>
                    <router-link to="/">&laquo; Splatoon 3 Schedules</router-link>
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
  @apply text-gray-50 text-3xl font-bold mb-2;
}

.faq h2 {
  @apply text-gray-100 text-xl font-semibold mb-1;
}

.faq p {
  @apply mb-2;
}

.faq a {
  @apply underline;
}
</style>
