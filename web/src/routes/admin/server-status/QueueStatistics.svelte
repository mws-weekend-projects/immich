<script lang="ts">
  import { asQueueItem } from '#lib/services/queue.service.ts';
  import { locale } from '#lib/stores/preferences.store.ts';
  import { getQueues, QueueName, type QueueResponseDto } from '@immich/sdk';
  import { Table, TableBody, TableCell, TableHeader, TableHeading, TableRow, Text } from '@immich/ui';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  const queueOrder = [QueueName.MetadataExtraction, QueueName.ThumbnailGeneration, QueueName.Library,
    QueueName.VideoConversion, QueueName.FaceDetection, QueueName.FacialRecognition, QueueName.SmartSearch, QueueName.Ocr];
  let queues = $state<QueueResponseDto[]>([]);
  let eta = $state<Record<string, number | null>>({});
  let snapshots: Record<string, { backlog: number; timestamp: number }> = {};
  let workerQueues = $derived(queueOrder.flatMap((name) => queues.find((queue) => queue.name === name) ?? []));

  const update = async () => {
    const next = await getQueues();
    const timestamp = Date.now();
    const nextEta: Record<string, number | null> = {};
    for (const queue of next) {
      const backlog = queue.statistics.waiting + queue.statistics.active;
      const previous = snapshots[queue.name];
      const elapsed = previous ? (timestamp - previous.timestamp) / 1000 : 0;
      const processed = previous ? previous.backlog - backlog : 0;
      nextEta[queue.name] = backlog === 0 ? 0 : elapsed > 0 && processed > 0 ? Math.ceil(backlog * elapsed / processed) : null;
      snapshots[queue.name] = { backlog, timestamp };
    }
    eta = nextEta;
    queues = next;
  };

  const formatEta = (seconds: number | null | undefined) => {
    if (seconds == null) return '—';
    if (seconds < 60) return '<1m';
    const minutes = Math.ceil(seconds / 60);
    return minutes < 60 ? `${minutes.toLocaleString($locale)}m` : `${Math.floor(minutes / 60).toLocaleString($locale)}h ${minutes % 60}m`;
  };

  onMount(() => {
    void update().catch(console.error);
    const timer = setInterval(() => void update().catch(console.error), 5000);
    return () => clearInterval(timer);
  });
</script>

<div>
  <Text class="mb-2 mt-4" fontWeight="medium">{$t('jobs')}</Text>
  <Table striped size="small" class="table-fixed">
    <TableHeader><TableHeading>{$t('jobs')}</TableHeading><TableHeading>{$t('waiting')}</TableHeading><TableHeading>{$t('active')}</TableHeading><TableHeading>{$t('failed')}</TableHeading><TableHeading>{$t('status')}</TableHeading><TableHeading>ETA</TableHeading></TableHeader>
    <TableBody>
      {#each workerQueues as queue (queue.name)}
        <TableRow><TableCell><a href="/admin/queues/{queue.name}">{asQueueItem($t, queue).title}</a></TableCell><TableCell>{queue.statistics.waiting.toLocaleString($locale)}</TableCell><TableCell>{queue.statistics.active.toLocaleString($locale)}</TableCell><TableCell>{queue.statistics.failed.toLocaleString($locale)}</TableCell><TableCell>{queue.isPaused ? $t('paused') : $t('active')}</TableCell><TableCell>{formatEta(eta[queue.name])}</TableCell></TableRow>
      {/each}
    </TableBody>
  </Table>
</div>
