<script lang="ts">
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import type {
    AssetMetadataField,
    AssetMetadataModeSettings,
    AssetMetadataOverlayMode,
  } from '$lib/stores/preferences.store';
  import { locale } from '$lib/stores/preferences.store';
  import { getDimensions } from '$lib/utils/asset-utils';
  import { getByteUnitString } from '$lib/utils/byte-units';
  import { fromISODateTime, fromISODateTimeUTC, fromTimelinePlainDateTime } from '$lib/utils/timeline-util';
  import type { AssetResponseDto } from '@immich/sdk';
  import { Tooltip } from '@immich/ui';
  import { t } from 'svelte-i18n';

  interface Props {
    asset: TimelineAsset;
    assetInfo?: AssetResponseDto;
    mode: Exclude<AssetMetadataOverlayMode, 'off'>;
    settings: AssetMetadataModeSettings;
    selected?: boolean;
  }

  let { asset, assetInfo, mode, settings, selected = false }: Props = $props();

  const getFieldLabel = (field: AssetMetadataField) => {
    switch (field) {
      case 'dateTime': {
        return $t('date_and_time');
      }
      case 'fileName': {
        return $t('filename');
      }
      case 'path': {
        return $t('path');
      }
      case 'camera': {
        return $t('camera_model');
      }
      case 'dimensions': {
        return `${$t('width')} × ${$t('height')}`;
      }
      case 'fileSize': {
        return $t('file_size');
      }
      case 'lens': {
        return $t('lens_model');
      }
      case 'exposure': {
        return $t('exposure_time');
      }
    }
  };

  const getDateTimeValue = () => {
    const timeZone = assetInfo?.exifInfo?.timeZone;
    const dateTime =
      timeZone && assetInfo?.exifInfo?.dateTimeOriginal
        ? fromISODateTime(assetInfo.exifInfo.dateTimeOriginal, timeZone)
        : assetInfo
          ? fromISODateTimeUTC(assetInfo.localDateTime)
          : fromTimelinePlainDateTime(asset.localDateTime);

    return dateTime.isValid
      ? dateTime.toLocaleString(
          {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          },
          { locale: $locale },
        )
      : undefined;
  };

  const getFieldValue = (field: AssetMetadataField): string | undefined => {
    const exifInfo = assetInfo?.exifInfo;

    switch (field) {
      case 'dateTime': {
        return getDateTimeValue();
      }
      case 'fileName': {
        return assetInfo?.originalFileName;
      }
      case 'path': {
        return assetInfo?.originalPath;
      }
      case 'camera': {
        const camera = [exifInfo?.make, exifInfo?.model].filter(Boolean).join(' ');
        return camera || undefined;
      }
      case 'dimensions': {
        if (exifInfo?.exifImageWidth && exifInfo.exifImageHeight) {
          const { width, height } = getDimensions(exifInfo);
          return width && height ? `${width} × ${height}` : undefined;
        }

        return assetInfo?.width && assetInfo.height ? `${assetInfo.width} × ${assetInfo.height}` : undefined;
      }
      case 'fileSize': {
        const size = exifInfo?.fileSizeInByte;
        return size ? getByteUnitString(size, $locale) : undefined;
      }
      case 'lens': {
        return exifInfo?.lensModel || undefined;
      }
      case 'exposure': {
        const exposure = [
          exifInfo?.fNumber ? `ƒ/${exifInfo.fNumber}` : undefined,
          exifInfo?.exposureTime ? `${exifInfo.exposureTime} s` : undefined,
          exifInfo?.iso ? `ISO ${exifInfo.iso}` : undefined,
        ].filter(Boolean);
        return exposure.length > 0 ? exposure.join(' · ') : undefined;
      }
    }
  };

  let fields = $derived(settings.order.filter((field) => settings.enabled.includes(field)));
</script>

{#if fields.length > 0}
  <div
    class={[
      'pointer-events-none absolute inset-x-0 bottom-0 z-2 overflow-hidden px-2 pt-8 pb-2 text-[10px] leading-tight text-white text-shadow-sm',
      'bg-linear-to-t from-black/85 via-black/55 to-transparent',
      mode === 'compact' ? 'max-h-[60%]' : 'max-h-[75%]',
      { 'rounded-b-xl': selected },
    ]}
    data-testid="asset-metadata-overlay"
  >
    {#each fields as field (field)}
      {@const value = getFieldValue(field)}
      {#if value}
        {@const label = getFieldLabel(field)}
        <div class="flex min-w-0 gap-1" data-field={field}>
          {#if settings.showLabels}
            <span class="shrink-0 text-white/70">{label}:</span>
          {/if}
          {#if field === 'path'}
            <Tooltip text={value}>
              {#snippet child({ props })}
                <span
                  {...props}
                  class="pointer-events-auto line-clamp-4 block min-w-0 break-all whitespace-normal"
                  title={value}>{value}</span
                >
              {/snippet}
            </Tooltip>
          {:else}
            <span class="min-w-0 truncate">{value}</span>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/if}
