<script lang="ts">
  import StatsCard from '$lib/components/server-statistics/ServerStatisticsCard.svelte';
  import { asQueueItem, handlePauseQueue, handleResumeQueue } from '$lib/services/queue.service';
  import { locale } from '$lib/stores/preferences.store';
  import { handleError } from '$lib/utils/handle-error';
  import { getBytesWithUnit } from '$lib/utils/byte-units';
  import {
    QueueCommand,
    QueueName,
    runQueueCommandLegacy,
    updateQueue,
    type QueueResponseDto,
    type ServerStatsResponseDto,
  } from '@immich/sdk';
  import {
    Code,
    FormatBytes,
    Icon,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeading,
    TableRow,
    Text,
  } from '@immich/ui';
  import { mdiCameraIris, mdiChartPie, mdiPlayCircle } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    stats: ServerStatsResponseDto;
    queues: QueueResponseDto[];
    queueEtaSeconds: Record<string, number | null>;
    onQueueActionCompleted: () => Promise<void> | void;
  };

  const { stats, queues, queueEtaSeconds, onQueueActionCompleted }: Props = $props();

  type QueueAction = 'pause' | 'resume' | 'start';

  let queueActionInProgress = $state<Record<string, QueueAction | undefined>>({});

  const zeros = (value: number, maxLength = 13) => {
    const valueLength = value.toString().length;
    const zeroLength = maxLength - valueLength;

    return '0'.repeat(zeroLength);
  };

  const formatEta = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) {
      return '—';
    }

    if (seconds < 60) {
      return '<1m';
    }

    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes.toLocaleString($locale)}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours.toLocaleString($locale)}h`;
    }

    return `${hours.toLocaleString($locale)}h ${remainingMinutes.toLocaleString($locale)}m`;
  };

  const runQueueAction = async (queue: QueueResponseDto, action: QueueAction) => {
    if (queueActionInProgress[queue.name]) {
      return;
    }

    queueActionInProgress = { ...queueActionInProgress, [queue.name]: action };

    try {
      if (action === 'pause') {
        await handlePauseQueue(queue);
      }

      if (action === 'resume') {
        await handleResumeQueue(queue);
      }

      if (action === 'start') {
        if (queue.isPaused) {
          await updateQueue({ name: queue.name, queueUpdateDto: { isPaused: false } });
        }

        await runQueueCommandLegacy({
          name: queue.name,
          queueCommandDto: { command: QueueCommand.Start, force: false },
        });
      }

      await onQueueActionCompleted();
    } catch (error) {
      handleError(error, $t('errors.something_went_wrong'));
    } finally {
      queueActionInProgress = { ...queueActionInProgress, [queue.name]: undefined };
    }
  };

  const queueOrder = [
    QueueName.MetadataExtraction,
    QueueName.ThumbnailGeneration,
    QueueName.Library,
    QueueName.VideoConversion,
    QueueName.FaceDetection,
    QueueName.FacialRecognition,
    QueueName.SmartSearch,
    QueueName.Ocr,
  ];

  const TiB = 1024 ** 4;
  let [statsUsage, statsUsageUnit] = $derived(getBytesWithUnit(stats.usage, stats.usage > TiB ? 2 : 0));

  let workerQueues = $derived(
    queueOrder.flatMap((queueName) => {
      const queue = queues.find((item) => item.name === queueName);
      return queue ? [queue] : [];
    }),
  );
</script>

<div class="my-4 flex flex-col gap-5">
  <div>
    <Text class="mb-2" fontWeight="medium">{$t('total_usage')}</Text>

    <div class="hidden justify-between gap-4 lg:flex">
      <StatsCard icon={mdiCameraIris} title={$t('photos')} value={stats.photos} />
      <StatsCard icon={mdiPlayCircle} title={$t('videos')} value={stats.videos} />
      <StatsCard icon={mdiChartPie} title={$t('storage')} value={statsUsage} unit={statsUsageUnit} />
    </div>

    <div class="mt-5 flex lg:hidden">
      <div class="flex flex-col justify-between rounded-3xl bg-subtle p-5 dark:bg-immich-dark-gray">
        <div class="flex flex-wrap gap-x-12">
          <div class="flex flex-1 place-items-center gap-4 text-primary">
            <Icon icon={mdiCameraIris} size="25" />
            <Text size="medium" fontWeight="medium">{$t('photos')}</Text>
          </div>

          <div class="relative text-center font-mono text-2xl font-medium">
            <span class="text-light-300">{zeros(stats.photos)}</span><span class="text-primary">{stats.photos}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-x-12">
          <div class="flex flex-1 place-items-center gap-4 text-primary">
            <Icon icon={mdiPlayCircle} size="25" />
            <Text size="medium" fontWeight="medium">{$t('videos')}</Text>
          </div>

          <div class="relative text-center font-mono text-2xl font-medium">
            <span class="text-light-300">{zeros(stats.videos)}</span><span class="text-primary">{stats.videos}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-x-5">
          <div class="flex flex-1 flex-nowrap place-items-center gap-4 text-primary">
            <Icon icon={mdiChartPie} size="25" />
            <Text size="medium" fontWeight="medium">{$t('storage')}</Text>
          </div>

          <div class="relative flex text-center font-mono text-2xl font-medium">
            <span class="text-light-300">{zeros(statsUsage)}</span><span class="text-primary">{statsUsage}</span>

            <div class="absolute -end-1.5 -bottom-4">
              <Code color="muted" class="font-mono text-xs font-light">{statsUsageUnit}</Code>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div>
    <Text class="mb-2 mt-4" fontWeight="medium">{$t('user_usage_detail')}</Text>
    <Table striped size="small">
      <TableHeader>
        <TableHeading class="w-1/4">{$t('user')}</TableHeading>
        <TableHeading class="w-1/4">{$t('photos')}</TableHeading>
        <TableHeading class="w-1/4">{$t('videos')}</TableHeading>
        <TableHeading class="w-1/4">{$t('usage')}</TableHeading>
      </TableHeader>
      <TableBody class="block max-h-80 overflow-y-auto">
        {#each stats.usageByUser as user (user.userId)}
          <TableRow>
            <TableCell class="w-1/4">{user.userName}</TableCell>
            <TableCell class="w-1/4">
              {user.photos.toLocaleString($locale)} (<FormatBytes bytes={user.usagePhotos} />)</TableCell
            >
            <TableCell class="w-1/4">
              {user.videos.toLocaleString($locale)} (<FormatBytes bytes={user.usageVideos} precision={0} />)</TableCell
            >
            <TableCell class="w-1/4">
              <FormatBytes bytes={user.usage} precision={0} />
              {#if user.quotaSizeInBytes !== null}
                / <FormatBytes bytes={user.quotaSizeInBytes} precision={0} />
              {/if}
              <span class="text-primary">
                {#if user.quotaSizeInBytes !== null && user.quotaSizeInBytes >= 0}
                  ({(user.quotaSizeInBytes === 0 ? 1 : user.usage / user.quotaSizeInBytes).toLocaleString($locale, {
                    style: 'percent',
                    maximumFractionDigits: 0,
                  })})
                {:else}
                  ({$t('unlimited')})
                {/if}
              </span>
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>

  <div>
    <Text class="mb-2 mt-4" fontWeight="medium">{$t('jobs')}</Text>
    <Table striped size="small" class="table-fixed">
      <TableHeader>
        <TableHeading class="w-[36%] text-left">{$t('jobs')}</TableHeading>
        <TableHeading class="w-[9%]">{$t('waiting')}</TableHeading>
        <TableHeading class="w-[9%]">{$t('active')}</TableHeading>
        <TableHeading class="w-[9%]">{$t('failed')}</TableHeading>
        <TableHeading class="w-[10%]">{$t('status')}</TableHeading>
        <TableHeading class="w-[10%]">ETA</TableHeading>
        <TableHeading class="w-[17%] text-left">{$t('actions')}</TableHeading>
      </TableHeader>
      <TableBody>
        {#each workerQueues as queue (queue.name)}
          <TableRow>
            <TableCell class="w-[36%] text-left">{asQueueItem($t, queue).title}</TableCell>
            <TableCell class="w-[9%]">{queue.statistics.waiting.toLocaleString($locale)}</TableCell>
            <TableCell class="w-[9%]">{queue.statistics.active.toLocaleString($locale)}</TableCell>
            <TableCell class="w-[9%]">{queue.statistics.failed.toLocaleString($locale)}</TableCell>
            <TableCell class="w-[10%]">{queue.isPaused ? $t('paused') : $t('active')}</TableCell>
            <TableCell class="w-[10%]">{formatEta(queueEtaSeconds[queue.name])}</TableCell>
            <TableCell class="w-[17%] text-left">
              {#if queueActionInProgress[queue.name]}
                <span class="text-xs text-light-500">{$t('loading')}</span>
              {:else}
                <div class="flex items-center gap-2 text-xs">
                  {#if queue.isPaused}
                    <button
                      type="button"
                      class="text-primary hover:underline"
                      onclick={() => void runQueueAction(queue, 'resume')}
                    >
                      {$t('resume')}
                    </button>
                  {:else}
                    <button
                      type="button"
                      class="text-primary hover:underline"
                      onclick={() => void runQueueAction(queue, 'pause')}
                    >
                      {$t('pause')}
                    </button>
                  {/if}
                  <span class="text-light-500">|</span>
                  <button
                    type="button"
                    class="text-primary hover:underline"
                    onclick={() => void runQueueAction(queue, 'start')}
                  >
                    {$t('start')}
                  </button>
                </div>
              {/if}
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</div>
