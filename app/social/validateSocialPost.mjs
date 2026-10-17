import twitterText from 'twitter-text';
import { RichText } from '@atproto/api';

export function validateSocialPost(status, network, locale = 'en-US') {
  if ((status.locale ?? 'en-US') !== locale) {
    throw new Error(`Cannot send ${status.locale ?? 'en-US'} content to a ${locale} account`);
  }

  // Japanese characters count toward Twitter's weighted limit differently from Latin text.
  if (locale !== 'ja-JP') return;

  if (typeof status.status !== 'string' || !status.status.trim()) {
    throw new Error('Japanese posts require nonempty text');
  }

  if (network === 'twitter' && !twitterText.parseTweet(status.status).valid) {
    throw new Error('Japanese post exceeds Twitter’s weighted character limit');
  }

  if (network === 'bluesky' && (new RichText({ text: status.status }).graphemeLength > 300
    || Buffer.byteLength(status.status, 'utf8') > 3000)) {
    throw new Error('Japanese post exceeds Bluesky’s character limit');
  }
}
