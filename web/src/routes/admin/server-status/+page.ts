import { authenticate } from '$lib/utils/auth';
import { getFormatter } from '$lib/utils/i18n';
import { getQueues, getServerStatistics } from '@immich/sdk';
import type { PageLoad } from './$types';

export const load = (async ({ url }) => {
  await authenticate(url, { admin: true });
  const [stats, queues] = await Promise.all([getServerStatistics(), getQueues()]);
  const $t = await getFormatter();

  return {
    stats,
    queues,
    meta: {
      title: $t('server_stats'),
    },
  };
}) satisfies PageLoad;
