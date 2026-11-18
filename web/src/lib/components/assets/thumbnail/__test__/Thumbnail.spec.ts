import Thumbnail from '#lib/components/assets/thumbnail/Thumbnail.svelte';
import { assetMetadataOverlaySettings } from '#lib/stores/preferences.store.ts';
import { getTabbable } from '#lib/utils/focus-util.ts';
import { factory } from '#test/unit/factories.ts';
import { renderWithTooltips } from '#test/unit/helpers.ts';
import { tick } from 'svelte';
import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Thumbnail component', () => {
  const originalSettings = get(assetMetadataOverlaySettings);
  afterEach(() => assetMetadataOverlaySettings.set(originalSettings));

  it('keeps a single tabbable element', async () => {
    const { baseElement } = await renderWithTooltips(Thumbnail, { asset: factory.timelineAsset(), selected: true });
    const container = baseElement.querySelector('[data-thumbnail-focus-container]')!;
    expect(container.getAttribute('tabindex')).toBe('0');
    expect(getTabbable(container)).toHaveLength(0);
  });

  it('shows metadata only after the hover delay', async () => {
    assetMetadataOverlaySettings.set({
      mode: 'compact', delayMs: 100,
      compact: { enabled: ['dateTime'], order: ['dateTime'], showLabels: true },
      detailed: { enabled: [], order: ['dateTime'], showLabels: true },
    });
    const { baseElement } = await renderWithTooltips(Thumbnail, { asset: factory.timelineAsset() });
    const container = baseElement.querySelector('[data-thumbnail-focus-container]')!;
    container.dispatchEvent(new MouseEvent('mouseenter'));
    await tick();
    expect(baseElement.querySelector('[data-testid="asset-metadata-overlay"]')).toBeNull();
    await vi.waitFor(() => expect(baseElement.querySelector('[data-testid="asset-metadata-overlay"]')).not.toBeNull(), { timeout: 3000 });
  });

  it('passes the asset to the click handler', async () => {
    const onClick = vi.fn();
    const asset = factory.timelineAsset();
    const { baseElement } = await renderWithTooltips(Thumbnail, { asset, onClick });
    (baseElement.querySelector('[data-thumbnail-focus-container]') as HTMLElement).click();
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: asset.id }));
  });
});
