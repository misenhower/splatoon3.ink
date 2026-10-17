const postFields = 'id status channelId externalLink';

export default class BufferApi {
  constructor(apiKey = process.env.BUFFER_API_KEY) {
    this.apiKey = apiKey;
  }

  async request(query, variables = {}) {
    if (!this.apiKey) {
      throw new Error('Missing BUFFER_API_KEY');
    }

    const response = await fetch('https://api.buffer.com', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Buffer HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.errors?.length || !result.data) {
      throw new Error(
        result.errors?.map(error => error.message).join('; ') || 'Buffer returned no data',
      );
    }

    return result.data;
  }

  async createPost(channelId, text, assets) {
    const data = await this.request(`
      mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          ... on PostActionSuccess { post { ${postFields} } }
          ... on MutationError { message }
        }
      }
    `, {
      input: {
        channelId,
        text,
        assets,
        schedulingType: 'automatic',
        mode: 'shareNow',
        saveToDraft: false,
        needsApproval: false,
      },
    });

    if (data.createPost?.message) {
      throw new Error(data.createPost.message);
    }

    const post = data.createPost?.post;

    if (!post?.id || !post.status || post.channelId !== channelId) {
      throw new Error('Buffer returned an unexpected post; check Buffer before retrying');
    }

    return post;
  }

  async getChannel(id) {
    const data = await this.request(`
      query GetChannel($input: ChannelInput!) {
        channel(input: $input) { id service isDisconnected isLocked }
      }
    `, { input: { id } });

    return data.channel;
  }

  async listChannels() {
    const data = await this.request('query { account { organizations { id } } }');
    const channels = [];

    for (const organization of data.account.organizations) {
      const result = await this.request(`
        query GetChannels($input: ChannelsInput!) {
          channels(input: $input) { id name service isDisconnected isLocked }
        }
      `, { input: { organizationId: organization.id } });

      channels.push(...result.channels);
    }

    return channels;
  }
}
