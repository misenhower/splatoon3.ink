import CountdownTweet from "./generators/CountdownTweet.mjs";
import TwitterManager from "./TwitterManager.mjs"

export function defaultTwitterManager() {
  return new TwitterManager([
    new CountdownTweet,
  ]);
}

export function sendTweets() {
  return defaultTwitterManager().sendTweets();
}
