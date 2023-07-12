import threads from "threads-api";
import Client from "./Client.mjs";

export default class ThreadsClient extends Client {
  key = "threads";
  name = "Threads";

  #api;

  constructor() {
    super();

    this.#api = new threads.ThreadsAPI({
      username: process.env.THREADS_USERNAME,
      password: process.env.THREADS_PASSWORD,
    });
  }

  async send(status, generator) {
    await this.#api.publish({
      text: status.status,
      image: status.media[0].file,
    });
  }
}
