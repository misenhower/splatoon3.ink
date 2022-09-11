import { acceptHMRUpdate, defineStore } from 'pinia'

function now() {
  let time = (new Date).getTime();

  // We only need the time to be accurate to one second
  return Math.trunc(time / 1000) * 1000;
}

let timer;

export const useTimeStore = defineStore('time', {
  state: () => ({
    now: now(),
  }),
  actions: {
    updateNow() {
      this.now = now();
    },
    startUpdatingNow() {
      if (!timer) {
        timer = setInterval(() => {
          // Reduce noise on the devtools timeline
          // by only updating when we need to.
          if (this.now !== now()) {
            this.updateNow();
          }
        }, 200);
      }
    },
    stopUpdatingNow() {
      clearInterval(timer);
      timer = null;
    },
    isCurrent(endTime) {
      return endTime
        ? Date.parse(endTime) > this.now
        : false;
    },
    isActive(startTime, endTime) {
      return (startTime && endTime)
        ? Date.parse(startTime) <= this.now && this.isCurrent(endTime)
        : false;
    },
    isUpcoming(startTime) {
      return startTime
        ? Date.parse(startTime) > this.now
        : false;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTimeStore, import.meta.hot));
}
