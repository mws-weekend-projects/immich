import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { getIntersectionObserverMock } from '$lib/__mocks__/intersection-observer.mock';
import Thumbnail from '$lib/components/assets/thumbnail/Thumbnail.svelte';
import { assetMetadataOverlaySettings } from '$lib/stores/preferences.store';
import { getTabbable } from '$lib/utils/focus-util';
import { timelineAssetFactory } from '@test-data/factories/asset-factory';

vi.mock('$lib/utils/navigation', () => ({
  currentUrlReplaceAssetId: vi.fn(),
  isSharedLinkRoute: vi.fn().mockReturnValue(false),
}));

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    enumerable: true,
    value: vi.fn().mockImplementation(function (query) {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
});

describe('Thumbnail component', () => {
  const originalSettings = get(assetMetadataOverlaySettings);

  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', getIntersectionObserverMock());
  });

  afterEach(() => {
    assetMetadataOverlaySettings.set(originalSettings);
    vi.useRealTimers();
  });

  it('should only contain a single tabbable element (the container)', () => {
    const asset = timelineAssetFactory.build({
      localDateTime: { year: 2024, month: 1, day: 1, hour: 12, minute: 0, second: 0, millisecond: 0 },
    });
    const { baseElement } = render(Thumbnail, {
      asset,
      selected: true,
    });

    const container = baseElement.querySelector('[data-thumbnail-focus-container]');
    expect(container).not.toBeNull();
    expect(container!.getAttribute('tabindex')).toBe('0');

    // Guarding against inserting extra tabbable elements in future in <Thumbnail/>
    const tabbables = getTabbable(container!);
    expect(tabbables.length).toBe(0);
  });

  it('shows thumbhash while image is loading', () => {
    const asset = timelineAssetFactory.build({
      localDateTime: { year: 2024, month: 1, day: 1, hour: 12, minute: 0, second: 0, millisecond: 0 },
    });
    const sut = render(Thumbnail, {
      asset,
      selected: true,
    });

    const thumbhash = sut.getByTestId('thumbhash');
    expect(thumbhash).not.toBeFalsy();
  });

  it('does not show metadata before the hover delay and shows it afterwards', async () => {
    vi.useFakeTimers();
    const asset = timelineAssetFactory.build({
      localDateTime: { year: 2024, month: 1, day: 1, hour: 12, minute: 0, second: 0, millisecond: 0 },
    });
    assetMetadataOverlaySettings.set({
      mode: 'compact',
      delayMs: 350,
      compact: { enabled: ['dateTime'], order: ['dateTime'], showLabels: true },
      detailed: { enabled: [], order: ['dateTime'], showLabels: true },
    });

    const { baseElement } = render(Thumbnail, { asset });
    const container = baseElement.querySelector('[data-thumbnail-focus-container]') as HTMLElement;
    await fireEvent.mouseEnter(container);

    vi.advanceTimersByTime(349);
    expect(baseElement.querySelector('[data-testid="asset-metadata-overlay"]')).not.toBeInTheDocument();

    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(baseElement.querySelector('[data-testid="asset-metadata-overlay"]')).toBeInTheDocument();
  });

  it('keeps the existing click behavior', async () => {
    const onClick = vi.fn();
    const asset = timelineAssetFactory.build({
      localDateTime: { year: 2024, month: 1, day: 1, hour: 12, minute: 0, second: 0, millisecond: 0 },
    });
    const { baseElement } = render(Thumbnail, { asset, onClick });
    const container = baseElement.querySelector('[data-thumbnail-focus-container]') as HTMLElement;

    await fireEvent.click(container);

    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: asset.id }));
  });
});
