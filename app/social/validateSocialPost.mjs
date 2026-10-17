export function validateSocialPost(status, locale = 'en-US') {
  if ((status.locale ?? 'en-US') !== locale) {
    throw new Error(`Cannot send ${status.locale ?? 'en-US'} content to a ${locale} account`);
  }

  if (locale !== 'ja-JP') return;

  if (typeof status.status !== 'string' || !status.status.trim()) {
    throw new Error('Japanese posts require nonempty text');
  }
}
