import { describe, expect, it } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia } from 'pinia';
import ScheduleBox from '@/components/ScheduleBox.vue';
import DailyDropGear from '@/components/gear/DailyDropGear.vue';
import RegularGear from '@/components/gear/RegularGear.vue';
import SalmonRunBox from '@/components/salmonrun/SalmonRunBox.vue';
import ChallengeScheduleBox from '@/components/challenge/ChallengeScheduleBox.vue';
import SplatfestBox from '@/components/SplatfestBox.vue';
import SplatfestResultsBox from '@/components/SplatfestResultsBox.vue';

async function render(component, props) {
  const app = createSSRApp(component, props);
  app.use(createPinia());
  app.config.globalProperties.$t = key => key;

  return renderToString(app);
}

describe('loading cards without fetched data', () => {
  it.each([
    ['schedule', ScheduleBox, { type: 'regular' }, 'bg-tapes', 'schedule.types.regular'],
    ['daily drop', DailyDropGear, {}, 'bg-circles', 'gear.dailydrop'],
    ['regular gear', RegularGear, {}, 'bg-paper', 'gear.sale'],
    ['salmon run', SalmonRunBox, {}, 'bg-character', 'salmonrun.title'],
    ['challenges', ChallengeScheduleBox, { type: 'challenge' }, 'bg-tapes', 'events.available'],
    ['splatfest', SplatfestBox, {}, 'bg-camo-purple', 'festival.active'],
    ['splatfest results', SplatfestResultsBox, {}, 'bg-camo-purple', 'festival.results.title'],
  ])('renders %s with its normal artwork and static labels', async (_name, component, props, artwork, label) => {
    const html = await render(component, { ...props, loading: true });

    expect(html).toContain(artwork);
    expect(html).toContain(label);
    expect(html).not.toContain('times.checkback');
    expect(html).not.toContain('events.not_available');
  });

  it('disables stage previews and the upcoming schedule button while loading', async () => {
    const html = await render(ScheduleBox, { type: 'regular', loading: true });
    const buttons = html.match(/<button\b[^>]*>/g);

    expect(buttons).toHaveLength(5);
    expect(buttons.every(button => button.includes('disabled'))).toBe(true);
  });
});
