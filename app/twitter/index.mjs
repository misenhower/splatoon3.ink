import DailyDropGearTweet from "./generators/DailyDropGearTweet.mjs";
import RegularGearTweet from "./generators/RegularGearTweet.mjs";
import SchedulesTweet from "./generators/SchedulesTweet.mjs";
import SplatfestResultsTweet from "./generators/SplatfestResultsTweet.mjs";
import TwitterManager from "./TwitterManager.mjs"

export function defaultTwitterManager() {
  return new TwitterManager([
    new SchedulesTweet,
    new DailyDropGearTweet,
    new RegularGearTweet,
    new SplatfestResultsTweet,
  ]);
}

export function sendTweets() {
  return defaultTwitterManager().sendTweets();
}

export function testTweets() {
  return defaultTwitterManager().testTweets();
}
