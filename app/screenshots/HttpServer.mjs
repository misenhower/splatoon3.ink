import http from 'http';
import ecstatic from 'ecstatic';

export default class HttpServer
{
  /** @member {http.Server} */
  #server = null;

  get port() {
    return this.#server.address().port;
  }

  open() {
    return new Promise((resolve, reject) => {
      if (this.#server) {
        return resolve();
      }

      const handler = ecstatic({ root: './dist' });
      this.#server = http.createServer(handler);
      this.#server.on('listening', () => resolve());
      this.#server.listen();
    });
  }

  async close() {
    if (this.#server) {
      await this.#server.close();
      this.#server = null;
    }
  }
}
