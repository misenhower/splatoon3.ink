import CountdownTweet from "./generators/CountdownTweet.mjs";
import TwitterManager from "./TwitterManager.mjs"

export function sendTweets() {
  const manager = new TwitterManager([
    new CountdownTweet,
  ]);

  return manager.sendTweets();
}
