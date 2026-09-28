import { describe, expect, it } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import messages from '@/assets/i18n/en-US.json';
import { useTimeStore } from '@/stores/time.mjs';
import GearExpiry from './GearExpiry.vue';

describe('gear expiry labels', () => {
  it.each([
    [1, '1 second left'],
    [45, '45 seconds left'],
    [59, '59 seconds left'],
    [60, '1 minute left'],
    [3600, '1 hour left'],
  ])('shows the appropriate label with %i seconds left', async (seconds, label) => {
    const endTime = '2026-09-28T00:00:00Z';
    const app = createSSRApp(GearExpiry, { endTime });
    const pinia = createPinia();

    app.use(pinia);
    useTimeStore(pinia).setNow(Date.parse(endTime) - seconds * 1000);

    app.use(createI18n({
      legacy: false,
      locale: 'en-US',
      messages: { 'en-US': messages },
      datetimeFormats: {
        'en-US': {
          dateTimeShortWeekday: {
            weekday: 'short',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'UTC',
          },
        },
      },
    }));

    const html = await renderToString(app);

    expect(html).toContain(label);
    expect(html).toContain('title="Until Mon, 9/28, 12:00 AM"');
  });
});
