import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getVisualViewportMock } from '$lib/__mocks__/visual-viewport.mock';
import SearchBarTestWrapper from '$lib/components/shared-components/search-bar/__test__/SearchBarTestWrapper.svelte';
import { searchManager } from '$lib/managers/search-manager.svelte';

const mocks = vi.hoisted(() => ({
  featureFlagsManager: {
    value: {
      ocr: false,
      smartSearch: false,
    },
  },
  mediaQueryManager: {
    maxMd: true,
  },
}));

vi.mock('$lib/managers/feature-flags-manager.svelte', () => ({
  featureFlagsManager: mocks.featureFlagsManager,
}));

vi.mock('$lib/stores/media-query-manager.svelte', () => ({
  mediaQueryManager: mocks.mediaQueryManager,
}));

describe('SearchBar mobile dialog layout', () => {
  beforeEach(() => {
    searchManager.reset();
    mocks.mediaQueryManager.maxMd = true;
    vi.stubGlobal('visualViewport', getVisualViewportMock());
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  afterEach(() => {
    cleanup();
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  it('keeps the filter area scrollable and the footer outside that scroll area', async () => {
    render(SearchBarTestWrapper, { props: { grayTheme: false, lockMobilePageScroll: true } });

    await fireEvent.focus(screen.getByRole('combobox'));

    const panel = await screen.findByTestId('search-filter-panel');
    const scrollArea = screen.getByTestId('search-filter-scroll-area');
    const footer = screen.getByTestId('search-filter-footer');
    const clearButton = screen.getByTestId('search-filter-clear');
    const submitButton = screen.getByTestId('search-filter-submit');
    const footerControls = footer.querySelector(':scope > div:last-child');

    expect(panel.classList).toContain('max-md:flex');
    expect(panel.classList).toContain('max-md:overflow-hidden');
    expect(scrollArea.classList).toContain('max-md:overflow-y-auto');
    expect(scrollArea.classList).toContain('max-md:overscroll-contain');
    expect(scrollArea).not.toContainElement(footer);
    expect(footer.classList).toContain('max-md:shrink-0');
    expect(footerControls?.classList).toContain('max-md:grid');
    expect(footerControls?.classList).toContain('max-md:grid-cols-2');
    expect(clearButton.classList).toContain('max-md:min-h-11');
    expect(clearButton.classList).toContain('max-md:min-w-0');
    expect(submitButton.classList).toContain('max-md:min-h-11');
    expect(submitButton.classList).toContain('max-md:min-w-0');
  });

  it('locks the mobile page scroll while open and restores it when unmounted', async () => {
    const { unmount } = render(SearchBarTestWrapper, {
      props: { grayTheme: false, lockMobilePageScroll: true },
    });

    await fireEvent.focus(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(document.documentElement.style.overflow).toBe('hidden');
      expect(document.body.style.overflow).toBe('hidden');
    });

    unmount();

    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
  });

  it('does not lock page scrolling for desktop layouts', async () => {
    mocks.mediaQueryManager.maxMd = false;
    render(SearchBarTestWrapper, { props: { grayTheme: false, lockMobilePageScroll: true } });

    await fireEvent.focus(screen.getByRole('combobox'));
    await Promise.resolve();

    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
  });
});
