import SchedulesTweet from "./generators/SchedulesTweet.mjs";
import TwitterManager from "./TwitterManager.mjs"

export function defaultTwitterManager() {
  return new TwitterManager([
    new SchedulesTweet,
  ]);
}

export function sendTweets() {
  return defaultTwitterManager().sendTweets();
}
