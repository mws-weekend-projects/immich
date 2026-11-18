import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import ImageThumbnail from '#lib/components/assets/thumbnail/ImageThumbnail.svelte';

vi.mock('#lib/utils/sw-messaging.ts', () => ({
  cancelImageUrl: vi.fn(),
}));

describe('ImageThumbnail component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an img element with correct attributes', async () => {
    const { baseElement } = await render(ImageThumbnail, {
      url: '/test-thumbnail.jpg',
      altText: 'Test image',
      widthStyle: '200px',
    });
    const img = baseElement.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('/test-thumbnail.jpg');
    expect(img!.getAttribute('alt')).toBe('');
  });

  it('shows BrokenAsset on error', async () => {
    const { baseElement } = await render(ImageThumbnail, {
      url: '/test-thumbnail.jpg',
      altText: 'Test image',
      widthStyle: '200px',
    });
    const img = baseElement.querySelector('img')!;
    img.dispatchEvent(new Event('error'));
    await tick();

    expect(baseElement.querySelector('img')).toBeNull();
    expect(baseElement.querySelector('span')?.textContent).toEqual('error_loading_image');
  });

  it('falls back through alternate URLs before showing BrokenAsset', async () => {
    const { baseElement } = await render(ImageThumbnail, {
      url: '/test-thumbnail.jpg',
      fallbackUrls: ['/test-preview.jpg', '/test-original.jpg'],
      altText: 'Test image',
      widthStyle: '200px',
    });

    let img = baseElement.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/test-thumbnail.jpg');

    img.dispatchEvent(new Event('error'));
    await tick();
    img = baseElement.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/test-preview.jpg');

    img.dispatchEvent(new Event('error'));
    await tick();
    img = baseElement.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/test-original.jpg');

    img.dispatchEvent(new Event('error'));
    await tick();
    expect(baseElement.querySelector('img')).toBeNull();
    expect(baseElement.querySelector('span')?.textContent).toEqual('error_loading_image');
  });

  it('calls onComplete with false on successful load', async () => {
    const onComplete = vi.fn();
    const { baseElement } = await render(ImageThumbnail, {
      url: '/test-thumbnail.jpg',
      altText: 'Test image',
      widthStyle: '200px',
      onComplete,
    });
    const img = baseElement.querySelector('img')!;
    img.dispatchEvent(new Event('load'));
    await tick();
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it('calls onComplete with true on error', async () => {
    const onComplete = vi.fn();
    const { baseElement } = await render(ImageThumbnail, {
      url: '/test-thumbnail.jpg',
      altText: 'Test image',
      widthStyle: '200px',
      onComplete,
    });
    const img = baseElement.querySelector('img')!;
    img.dispatchEvent(new Event('error'));
    await tick();
    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it('applies hidden styles when hidden is true', async () => {
    const { baseElement } = await render(ImageThumbnail, {
      url: '/test-thumbnail.jpg',
      altText: 'Test image',
      widthStyle: '200px',
      hidden: true,
    });
    const img = baseElement.querySelector('img')!;
    expect(img.classList.contains('grayscale-50')).toBe(true);
    expect(img.classList.contains('opacity-50')).toBe(true);
  });

  it('sets alt text after loading', async () => {
    const { baseElement } = await render(ImageThumbnail, {
      url: '/test-thumbnail.jpg',
      altText: 'Test image',
      widthStyle: '200px',
    });
    const img = baseElement.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe('');

    img.dispatchEvent(new Event('load'));
    await tick();
    expect(img.getAttribute('alt')).toBe('Test image');
  });
});
