<template>
  <main class="not-found">
    <section class="portrait-card" aria-labelledby="error-title">
      <div class="portrait-orbit" aria-hidden="true" />
      <div class="portrait-dots" aria-hidden="true" />
      <div class="portrait-copy">
        <p class="eyebrow">
          Page not found
        </p>
        <h1 id="error-title">
          404
        </h1>
        <h2>...Oh, hey.</h2>
        <p class="error-description">
          That page? Uh...<br />I don’t think we have it.
        </p>
        <a href="/" class="home-button">
          <span class="squid" aria-hidden="true">&#57445;</span>
          Back home
        </a>
      </div>
      <img
        src="@/assets/img/harmony.png"
        alt="Harmony staring blankly into space"
        class="portrait-art"
        width="397"
        height="776"
      />
      <div class="portrait-bubble" aria-hidden="true">
        ...
      </div>
      <img src="@/assets/img/tape/tape-1.png" alt="" class="portrait-tape" />
      <span class="portrait-tag" aria-hidden="true">NOT FOUND / 404</span>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

let previousTitle;

onMounted(() => {
  previousTitle = document.title;
  document.title = '404 — Splatoon3.ink';
});

onUnmounted(() => {
  document.title = previousTitle;
});
</script>

<style scoped>
.not-found {
  display: grid;
  place-items: center;
  min-height: 100svh;
  padding: 90px 28px 60px;
}

.portrait-card {
  position: relative;
  width: min(704px, 100%);
  border-radius: 38px 65px 40px 52px;
  background: #5432bb url('@/assets/img/octoarrow-transparent.png') center / 240px;
  box-shadow: 0 20px 0 #0003, 0 26px 55px #0004;
  transform: rotate(-1.3deg);
  isolation: isolate;
}

.portrait-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid #bc92ff25;
  border-radius: inherit;
  pointer-events: none;
}

.portrait-orbit,
.portrait-dots {
  position: absolute;
  border-radius: 50%;
}

.portrait-orbit {
  left: 38px;
  top: 45px;
  width: 305px;
  height: 325px;
  background: #b990f5;
  transform: rotate(-14deg);
}

.portrait-dots {
  left: 27px;
  top: 29px;
  width: 330px;
  height: 350px;
  border: 2px dashed #dbc5ff75;
  transform: rotate(10deg);
}

.portrait-art {
  position: absolute;
  z-index: 2;
  left: 58px;
  bottom: -12px;
  height: 473px;
  width: auto;
  filter: drop-shadow(12px 13px 0 #28175635);
  transform: rotate(1.3deg);
}

.portrait-copy {
  position: relative;
  z-index: 3;
  padding: 34px 36px 40px 374px;
  transform: rotate(1.3deg);
}

.eyebrow {
  color: #d4c1ff;
  font: 12px/1.5 var(--font-family-s2);
  text-transform: uppercase;
  letter-spacing: .13em;
}

h1 {
  margin: 4px 0 8px -5px;
  color: #f1edff;
  font: 124px/1 var(--font-family-s1);
  text-shadow: 5px 7px #2c176d;
}

h2 {
  color: #eaff3d;
  font: 37px/1.2 var(--font-family-s2);
}

.error-description {
  margin-top: 12px;
  color: #e1d8fa;
  font: 17px/1.6 var(--font-family-s2);
}

.home-button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-top: 25px;
  padding: 12px 23px;
  border-radius: 999px;
  background: #eaff3d;
  color: #29232e;
  font: 17px/1.4 var(--font-family-s2);
  box-shadow: 0 5px 0 #28175670;
  transition: background .15s;
}

.home-button:hover {
  background: #f5ff9b;
}

.home-button:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 5px;
}

.squid {
  display: inline-block;
  transform: rotate(25deg);
}

.portrait-bubble {
  position: absolute;
  z-index: 3;
  top: -42px;
  left: 288px;
  padding: 1px 24px 17px;
  border-radius: 50%;
  background: #eaff3d;
  color: #382176;
  font: 44px/1.2 var(--font-family-s2);
  transform: rotate(9deg);
}

.portrait-bubble::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 18px;
  border-top: 20px solid #eaff3d;
  border-right: 18px solid transparent;
  transform: rotate(14deg);
}

.portrait-tape {
  position: absolute;
  right: 34px;
  top: -19px;
  width: 145px;
  transform: rotate(9deg);
}

.portrait-tag {
  position: absolute;
  bottom: -12px;
  left: 314px;
  padding: 5px 12px;
  background: #242328;
  color: #b5a4d7;
  font: 9px/1.4 monospace;
  letter-spacing: .12em;
  transform: rotate(4deg);
}

@media (max-width: 760px) {
  .portrait-card {
    width: min(360px, 100%);
    border-radius: 30px 40px 30px 35px;
  }

  .portrait-orbit {
    width: 233px;
    height: 233px;
    left: calc(50% - 116px);
    top: 26px;
  }

  .portrait-dots {
    width: 255px;
    height: 255px;
    left: calc(50% - 127px);
    top: 14px;
  }

  .portrait-art {
    left: calc(50% - 116px);
    top: -25px;
    bottom: auto;
    height: 292px;
  }

  .portrait-copy {
    padding: 274px 16px 29px;
    text-align: center;
  }

  h1 {
    position: absolute;
    top: 84px;
    left: 45%;
    font-size: clamp(64px, 20vw, 83px);
    transform: rotate(7deg);
  }

  h2 {
    margin-top: 9px;
    font-size: 34px;
  }

  .error-description {
    font-size: 16px;
  }

  .home-button {
    margin-top: 22px;
    font-size: 16px;
  }

  .portrait-bubble {
    top: 7px;
    left: auto;
    right: 24px;
    font-size: 29px;
    padding: 0 20px 12px;
  }

  .portrait-tape {
    width: 105px;
    top: -14px;
    right: auto;
    left: 10px;
    transform: rotate(-14deg);
  }

  .portrait-tag {
    left: auto;
    right: 20px;
  }
}
</style>
