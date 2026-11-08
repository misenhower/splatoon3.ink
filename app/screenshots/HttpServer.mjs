import http from 'http';
import { access } from 'node:fs/promises';
import sirv from 'sirv';

export default class HttpServer
{
  constructor({ root = './dist', host } = {}) {
    this.root = root;
    this.host = host;
  }

  /** @member {http.Server} */
  _server = null;

  get port() {
    return this._server.address().port;
  }

  async open() {
    if (this._server) {
      return;
    }

    await access(`${this.root}/screenshots/index.html`).catch(() => {
      throw new Error(`Missing ${this.root}/screenshots/index.html. Run npm run build first.`);
    });

    await new Promise((resolve, reject) => {
      const handler = sirv(this.root);
      this._server = http.createServer(handler);
      this._server.once('error', reject);
      this._server.listen(0, this.host, resolve);
    });
  }

  async close() {
    if (this._server) {
      let server = this._server;
      this._server = null;

      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
}
