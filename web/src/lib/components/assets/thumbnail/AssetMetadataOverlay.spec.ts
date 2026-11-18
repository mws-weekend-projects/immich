import { AssetTypeEnum } from '@immich/sdk';
import AssetMetadataOverlay from '#lib/components/assets/thumbnail/AssetMetadataOverlay.svelte';
import type { AssetMetadataModeSettings } from '#lib/stores/preferences.store.ts';
import { renderWithTooltips } from '#test/unit/helpers.ts';
import { factory } from '#test/unit/factories.ts';

const settings = (
  enabled: AssetMetadataModeSettings['enabled'],
  order: AssetMetadataModeSettings['order'],
  showLabels = true,
) => ({ enabled, order, showLabels });

const getFields = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>(':scope [data-testid="asset-metadata-overlay"] [data-field]')].map(
    (element) => element.dataset.field,
  );

describe('AssetMetadataOverlay', async () => {
  const asset = factory.timelineAsset();
  const assetInfo = factory.asset({
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

  it('renders enabled Compact fields in configured order', async () => {
    const view = await renderWithTooltips(AssetMetadataOverlay, {
      asset,
      assetInfo,
      mode: 'compact',
      settings: settings(['path', 'camera', 'dateTime'], ['dateTime', 'camera', 'path']),
    });

    expect(getFields(view.baseElement)).toEqual(['dateTime', 'camera', 'path']);
  });

  it('renders enabled Detailed fields in configured order', async () => {
    const view = await renderWithTooltips(AssetMetadataOverlay, {
      asset,
      assetInfo,
      mode: 'detailed',
      settings: settings(['fileName', 'dimensions', 'fileSize'], ['fileSize', 'fileName', 'dimensions']),
    });

    expect(getFields(view.baseElement)).toEqual(['fileSize', 'fileName', 'dimensions']);
  });

  it('does not render disabled fields', async () => {
    const view = await renderWithTooltips(AssetMetadataOverlay, {
      asset,
      assetInfo,
      mode: 'detailed',
      settings: settings(['dateTime'], ['dateTime', 'path', 'fileName']),
    });

    expect(getFields(view.baseElement)).toEqual(['dateTime']);
  });

  it('can hide field labels independently from the values', async () => {
    const view = await renderWithTooltips(AssetMetadataOverlay, {
      asset,
      assetInfo,
      mode: 'compact',
      settings: settings(['path'], ['path'], false),
    });

    expect(view.baseElement.querySelector('[data-field="path"]')?.textContent).toContain(assetInfo.originalPath);
    expect(view.baseElement.querySelector('[data-field="path"]')?.textContent).not.toContain('path:');
  });

  it('exposes the complete path on the truncated path value', async () => {
    const view = await renderWithTooltips(AssetMetadataOverlay, {
      asset,
      assetInfo,
      mode: 'compact',
      settings: settings(['path'], ['path']),
    });

    expect(view.baseElement.querySelector('[title="' + assetInfo.originalPath + '"]')).not.toBeNull();
  });
});
