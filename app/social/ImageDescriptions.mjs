export default class ImageDescriptions {
  constructor(messages) {
    this.messages = messages;
  }

  text(key, params) {
    return this.messages.text(`alt.${key}`, params);
  }

  duration(milliseconds, { days = false, seconds = false } = {}) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const dayCount = Math.floor(totalSeconds / 86400);
    const hourCount = Math.floor(totalSeconds / 3600);
    const format = (unit, count) => this.text(`duration.${unit}${count === 1 ? '' : 's'}`, { count });

    if (days && dayCount) {
      const hours = hourCount % 24;

      return [format('day', dayCount), hours ? format('hour', hours) : null].filter(Boolean).join(' ');
    }
    if (hourCount) return format('hour', hourCount);
    if (totalSeconds >= 60 || !seconds) return format('minute', Math.floor(totalSeconds / 60));

    return format('second', totalSeconds);
  }

  gear(gears, now, { brand = null } = {}) {
    const lines = [brand
      ? this.text('gear.daily', { brand: this.messages.game('brands', brand) })
      : this.text('gear.regular')];

    gears.forEach((item, index) => {
      const gear = item.gear;
      const details = [this.text('gear.item', {
        name: this.messages.game('gear', gear),
        price: item.price,
        time: this.duration(Date.parse(item.saleEndTime) - now, { seconds: true }),
      })];

      // The body already names the main ability for every Daily Drop item and the featured regular item.
      if (!brand && index > 0) {
        details.push(this.text('gear.ability', { power: this.messages.game('powers', gear.primaryGearPower) }));
      }
      if (!brand) {
        details.push(this.text('gear.brand', { brand: this.messages.game('brands', gear.brand) }));
      }
      details.push(this.text('gear.slots', { count: gear.additionalGearPowers.length }));
      lines.push(details.join(' '));
    });

    return lines.join('\n');
  }

  shift(schedule, now, { eggstra = false, upcoming = false } = {}) {
    const mode = eggstra ? this.text('shift.eggstra')
      : this.messages.text(schedule.isBigRun ? 'salmon.mode.bigRun' : 'salmon.mode.regular');
    const lines = [this.text('shift.stage', {
      mode,
      stage: this.messages.game('stages', schedule.settings.coopStage),
    })];

    if (this.messages.locale === 'ja-JP') {
      lines.push(`${this.messages.date(schedule.startTime)} – ${this.messages.date(schedule.endTime)} JST`);
    } else if (Date.parse(schedule.startTime) > now) {
      lines.push(this.text('shift.opens', {
        time: this.duration(Date.parse(schedule.startTime) - now, { days: true }),
      }));
    } else {
      lines.push(this.text('shift.remaining', {
        time: this.duration(Date.parse(schedule.endTime) - now),
      }));
    }

    if (upcoming && !eggstra && schedule.settings.boss) {
      lines.push(this.messages.text('salmon.king', { king: this.messages.game('bosses', schedule.settings.boss) }));
    }

    return lines.join('\n');
  }

  festival(festival, { includeTheme = false } = {}) {
    const names = festival.teams.map((_, index) => this.messages.game('festivals', festival, `teams.${index}.teamName`));
    const lines = [];

    if (includeTheme) {
      lines.push(this.text('festival.theme', { title: this.messages.game('festivals', festival, 'title') }));
    }
    lines.push(this.text('festival.teams', { teams: names.join(this.text('separator')) }));

    if (festival.hasResults) {
      const winner = festival.teams.findIndex(team => team.result.isWinner);
      if (winner >= 0) lines.push(this.text('festival.winner', { team: names[winner] }));

      const categories = [
        ['conchs', 'horagaiRatio'],
        ['votes', 'voteRatio'],
        ['open', 'regularContributionRatio'],
        ['pro', 'challengeContributionRatio'],
        ['tricolor', 'tricolorContributionRatio'],
      ];

      for (const [category, key] of categories) {
        if (!festival.teams.every(team => typeof team.result[key] === 'number')) continue;

        const values = festival.teams.map((team, index) => this.text('festival.value', {
          team: names[index],
          percent: (team.result[key] * 100).toFixed(2),
        }));
        lines.push(this.text('festival.row', {
          category: this.text(`festival.${category}`),
          values: values.join(this.text('separator')),
        }));
      }
    }

    return lines.join('\n');
  }
}
