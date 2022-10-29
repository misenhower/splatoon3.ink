import { useAnarchyOpenSchedulesStore, useAnarchySeriesSchedulesStore, useRegularSchedulesStore, useSplatfestSchedulesStore } from '@/stores/schedules';
import battleRegularSvg from '@/assets/img/modes/regular.svg';
import battleBankaraSvg from '@/assets/img/modes/bankara.svg';

export function useScheduleTypes() {
  const types = {
    regular: {
      name: 'schedule.types.regular',
      badge: null,
      store: useRegularSchedulesStore(),
      img: battleRegularSvg,
      bg: 'bg-splatoon-battle-regular bg-tapes',
    },
    anarchySeries: {
      name: 'schedule.types.anarchy',
      badge: 'schedule.types.series',
      store: useAnarchySeriesSchedulesStore(),
      img: battleBankaraSvg,
      bg: 'bg-splatoon-battle-ranked bg-tapes',
    },
    anarchyOpen: {
      name: 'schedule.types.anarchy',
      badge: 'schedule.types.open',
      store: useAnarchyOpenSchedulesStore(),
      img: battleBankaraSvg,
      bg: 'bg-splatoon-battle-ranked bg-tapes',
    },
    splatfest: {
      name: 'schedule.types.splatfest',
      badge: null,
      store: useSplatfestSchedulesStore(),
      img: battleRegularSvg,
      bg: 'bg-splatoon-battle-regular bg-tapes',
    },
  };

  return { types };
}


