import fs from 'fs/promises';
import path from 'path';
import mkdirp from 'mkdirp';
import jsonpath from 'jsonpath';
import get from 'lodash/get.js';
import set from 'lodash/set.js';
import pLimit from 'p-limit';

const limit = pLimit(1);

function makeArray(value) {
  return Array.isArray(value) ? value : [value];
}

export class LocalizationProcessor {
  outputDirectory = 'dist/data/locale';

  constructor(locale, rulesets) {
    this.locale = locale;
    this.rulesets = rulesets;
  }

  get filename() {
    return `${this.outputDirectory}/${this.locale.code}.json`;
  }

  *rulesetIterations() {
    for (let ruleset of this.rulesets) {
      for (let node of makeArray(ruleset.nodes)) {
        for (let value of makeArray(ruleset.values)) {
          yield {
            key: ruleset.key,
            node,
            id: ruleset.id,
            value,
          };
        }
      }
    }
  }

  *dataIterations(data) {
    for (let ruleset of this.rulesetIterations()) {
      for (let node of jsonpath.query(data, ruleset.node)) {
        if (!node) continue;

        let id = get(node, ruleset.id);

        yield {
          ruleset,
          node,
          id,
          value: get(node, ruleset.value),
          path: `${ruleset.key}.${id}.${ruleset.value}`,
        };
      }
    }
  }

  async updateLocalizations(data) {
    // We're reading, modifying, and writing back to the same file,
    // so we have to make sure the whole operation is atomic.
    return limit(() => this._updateLocalizations(data));
  }

  async _updateLocalizations(data) {
    let localizations = await this.readData();

    for (let { path, value } of this.dataIterations(data)) {
      set(localizations, path, value);
    }

    await this.writeData(localizations);
  }

  async hasMissingLocalizations(data) {
    let localizations = await this.readData();

    for (let { path } of this.dataIterations(data)) {
      if (get(localizations, path) === undefined) {
        return true;
      }
    }

    return false;
  }

  async writeData(data) {
    // If we're running in debug mode, format the JSON output so it's easier to read
    let debug = !!process.env.DEBUG;
    let space = debug ? 2 : undefined;

    data = JSON.stringify(data, undefined, space);

    await mkdirp(path.dirname(this.filename));
    await fs.writeFile(this.filename, data);
  }

  async readData() {
    try {
      let result = await fs.readFile(this.filename);

      return JSON.parse(result) || {};
    } catch (e) {
      //
    }

    return {};
  }
}
