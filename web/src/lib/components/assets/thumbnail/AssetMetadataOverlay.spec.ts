import { AssetTypeEnum } from '@immich/sdk';
import AssetMetadataOverlay from '$lib/components/assets/thumbnail/AssetMetadataOverlay.svelte';
import type { AssetMetadataModeSettings } from '$lib/stores/preferences.store';
import { renderWithTooltips } from '$tests/helpers';
import { assetFactory, timelineAssetFactory } from '@test-data/factories/asset-factory';

const settings = (enabled: AssetMetadataModeSettings['enabled'], order: AssetMetadataModeSettings['order']) => ({
  enabled,
  order,
});

const getFields = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('[data-testid="asset-metadata-overlay"] [data-field]')].map(
    (element) => element.dataset.field,
  );

describe('AssetMetadataOverlay', () => {
  const asset = timelineAssetFactory.build();
  const assetInfo = assetFactory.build({
    type: AssetTypeEnum.Image,
    originalFileName: 'image.jpg',
    originalPath: '/photos/a-very-long-original-path/image.jpg',
    exifInfo: {
      exifImageWidth: 4000,
      exifImageHeight: 3000,
      make: 'Camera',
      model: 'Model',
      lensModel: 'Lens',
      fileSizeInByte: 1024,
      fNumber: 2.8,
      exposureTime: '1/125',
      iso: 100,
    },
  });

  it('renders enabled Compact fields in configured order', () => {
    const view = renderWithTooltips(AssetMetadataOverlay, {
      asset,
      assetInfo,
      mode: 'compact',
      settings: settings(['path', 'camera', 'dateTime'], ['dateTime', 'camera', 'path']),
    });

    expect(getFields(view.container)).toEqual(['dateTime', 'camera', 'path']);
  });

  it('renders enabled Detailed fields in configured order', () => {
    const view = renderWithTooltips(AssetMetadataOverlay, {
      asset,
      assetInfo,
      mode: 'detailed',
      settings: settings(['fileName', 'dimensions', 'fileSize'], ['fileSize', 'fileName', 'dimensions']),
    });

    expect(getFields(view.container)).toEqual(['fileSize', 'fileName', 'dimensions']);
  });

  it('does not render disabled fields', () => {
    const view = renderWithTooltips(AssetMetadataOverlay, {
      asset,
      assetInfo,
      mode: 'detailed',
      settings: settings(['dateTime'], ['dateTime', 'path', 'fileName']),
    });

    expect(getFields(view.container)).toEqual(['dateTime']);
  });

  it('exposes the complete path on the truncated path value', () => {
    const view = renderWithTooltips(AssetMetadataOverlay, {
      asset,
      assetInfo,
      mode: 'compact',
      settings: settings(['path'], ['path']),
    });

    expect(view.getByTitle(assetInfo.originalPath)).toBeInTheDocument();
  });
});
