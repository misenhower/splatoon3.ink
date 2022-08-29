<template>
  <MainLayout>
    <div class="grow flex items-center justify-center">
      <div class="w-full max-w-2xl mt-36 mb-20 mx-4">
        <div class="relative">
          <Splat2 class="absolute -top-32 -left-24 w-64" />
          <Splat5 class="absolute -right-28 -bottom-24 w-64" />

          <ProductContainer class="relative md:rotate-1">
            <div class="relative">
              <div class="faq text-gray-300 px-10">
                <div class="space-y-6">
                  <h1>FAQ</h1>

                  <div>
                    <h2>What is this?</h2>
                    <p>
                      This site is a fan-made, unofficial source of information for Nintendo's Splatoon 3.
                      You might remember me from <a href="https://splatoon2.ink" target="_blank">Splatoon2.ink</a>!
                    </p>
                  </div>

                  <div>
                    <h2>What information will be available here?</h2>
                    <p>
                      Current map rotations, SplatNet gear, and possibly a lot more depending what data Nintendo
                      includes in SplatNet 3.
                    </p>
                    <p>
                      More information will be available once the game is released. Stay tuned!
                    </p>
                  </div>

                  <div>
                    <h2>When will Splatoon3.ink come online?</h2>
                    <p>
                      Assuming SplatNet 3 works in a similar way to SplatNet 2, I'm hoping to have the site mostly
                      functional within a couple weeks after Splatoon 3 is released.
                    </p>
                    <p>
                      I've been a little constrained on time lately, but if everything goes well it shouldn't take too
                      long to get the data streams up and running.
                      The website itself (and the Twitter bot) may take a little more time since those require
                      additional design and layout effort.
                    </p>
                  </div>

                  <div>
                    <h2>What about the pre-release Splatfest World Premiere?</h2>
                    <p>
                      Nintendo doesn't usually make SplatNet available for pre-release events, so unfortunately, I don't
                      expect to be able to provide any data or updates for the Splatfest World Premiere.
                    </p>
                  </div>

                  <div>
                    <h2>Will there be a Twitter bot for Splatoon 3 updates?</h2>
                    <p>
                      Yes! <a href="https://twitter.com/splatoon3ink" target="_blank">@Splatoon3ink</a> will continue
                      posting updates for Splatoon 2 for now, but I expect to switch it over to Splatoon 3 updates
                      shortly after the game is released.
                    </p>
                    <p>
                      Once that account starts posting Splatoon 3 content, you'll be able to find Splatoon 2 updates at
                      <a href="https://twitter.com/splatoon2inkbot" target="_blank">@Splatoon2inkbot</a> instead.
                    </p>
                  </div>

                  <div>
                    <h2>What will happen to Splatoon2.ink?</h2>
                    <p>
                      <a href="https://splatoon2.ink" target="_blank">Splatoon2.ink</a> will remain online as long as
                      Nintendo keeps SplatNet 2 online.
                      Unfortunately, if Nintendo shuts down SplatNet 2, that site's data source will no longer be
                      available and it may not be possible to keep the site running.
                    </p>
                  </div>

                  <div>
                    <h2>My question wasn't answered here!</h2>
                    <p>
                      Please feel free to contact me on Twitter at <a href="https://twitter.com/splatoon3ink"
                        target="_blank">@Splatoon3ink</a> or via <a href="mailto:matt@isenhower.com"
                        target="_blank">email</a> if you have any other
                      questions!
                    </p>
                  </div>

                  <div>
                    <router-link to="/">&laquo; Splatoon 3 Countdown</router-link>
                  </div>
                </div>

                <img class="absolute hidden sm:block -top-16 right-14 w-48 -rotate-3" src="@/assets/img/tape/tape-1.png" />
                <img class="absolute -bottom-20 left-8 w-44 rotate-6" src="@/assets/img/tape/tape-3.png" />
                <img class="absolute top-20 -right-24 w-32 rotate-6" src="@/assets/img/stickers/sticker-4.png" />
                <img class="absolute hidden sm:block -bottom-14 right-32 w-44 -rotate-3" src="@/assets/img/stickers/sticker-10.png" />
              </div>
            </div>
          </ProductContainer>

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
