<script lang="ts">
  import AdminPageLayout from '$lib/components/layouts/AdminPageLayout.svelte';
  import ServerStatisticsPanel from '$lib/components/server-statistics/ServerStatisticsPanel.svelte';
  import { getQueues, getServerStatistics, type QueueResponseDto } from '@immich/sdk';
  import { Container } from '@immich/ui';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  type Props = {
    data: PageData;
  };

  type QueueBacklogSnapshot = {
    backlog: number;
    timestampMs: number;
  };

  const { data }: Props = $props();

  const getQueueBacklog = (queue: QueueResponseDto) =>
    queue.statistics.waiting + queue.statistics.active + queue.statistics.paused;

  const initialTimestampMs = Date.now();
  let stats = $state(data.stats);
  let queues = $state<QueueResponseDto[]>(data.queues);
  let queueBacklogSnapshots = $state<Record<string, QueueBacklogSnapshot>>(
    Object.fromEntries(
      data.queues.map((queue) => [
        queue.name,
        {
          backlog: getQueueBacklog(queue),
          timestampMs: initialTimestampMs,
        },
      ]),
    ),
  );
  let queueEtaSeconds = $state<Record<string, number | null>>({});

  const calculateEtaSeconds = (
    queue: QueueResponseDto,
    previous: QueueBacklogSnapshot | undefined,
    timestampMs: number,
  ): number | null => {
    const backlog = getQueueBacklog(queue);

    if (backlog === 0) {
      return 0;
    }

    if (!previous) {
      return null;
    }

    const elapsedSeconds = (timestampMs - previous.timestampMs) / 1000;
    if (elapsedSeconds <= 0) {
      return null;
    }

    const processed = previous.backlog - backlog;
    if (processed <= 0) {
      return null;
    }

    const processingRate = processed / elapsedSeconds;
    if (processingRate <= 0) {
      return null;
    }

    return Math.ceil(backlog / processingRate);
  };

  const updateStatistics = async () => {
    const [nextStats, nextQueues] = await Promise.all([getServerStatistics(), getQueues()]);
    const timestampMs = Date.now();
    const nextQueueBacklogSnapshots = { ...queueBacklogSnapshots };
    const nextQueueEtaSeconds = { ...queueEtaSeconds };

    for (const queue of nextQueues) {
      const previous = queueBacklogSnapshots[queue.name];

      if (queue.isPaused) {
        const backlog = getQueueBacklog(queue);
        nextQueueEtaSeconds[queue.name] = queueEtaSeconds[queue.name] ?? (backlog === 0 ? 0 : null);
        nextQueueBacklogSnapshots[queue.name] = { backlog, timestampMs };
        continue;
      }

      nextQueueEtaSeconds[queue.name] = calculateEtaSeconds(queue, previous, timestampMs);
      nextQueueBacklogSnapshots[queue.name] = {
        backlog: getQueueBacklog(queue),
        timestampMs,
      };
    }

    queueBacklogSnapshots = nextQueueBacklogSnapshots;
    queueEtaSeconds = nextQueueEtaSeconds;
    stats = nextStats;
    queues = nextQueues;
  };

  onMount(() => {
    const interval = setInterval(() => void updateStatistics(), 5000);

    return () => clearInterval(interval);
  });
</script>

<AdminPageLayout breadcrumbs={[{ title: data.meta.title }]}>
  <Container size="large" center>
    <ServerStatisticsPanel {stats} {queues} {queueEtaSeconds} onQueueActionCompleted={updateStatistics} />
  </Container>
</AdminPageLayout>
