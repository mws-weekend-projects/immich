import SearchBarTestWrapper from '#lib/components/shared-components/search-bar/__test__/SearchBarTestWrapper.svelte';
import { queryClient } from '#lib/queries/client.ts';
import { getUserConfigQuery } from '#lib/queries/config-user.query.ts';
import { searchManager } from '#lib/managers/search-manager.svelte.ts';
import { tick } from 'svelte';
import { expect, vi } from 'vitest';
import { test } from '#test/unit/fixtures.ts';
import { render } from 'vitest-browser-svelte';

const mocks = vi.hoisted(() => ({ mediaQueryManager: { maxMd: true } }));
vi.mock('#lib/stores/media-query-manager.svelte.ts', () => ({ mediaQueryManager: mocks.mediaQueryManager }));

test.describe('SearchBar mobile dialog layout', () => {
  test.beforeEach(async () => {
    await queryClient.query(getUserConfigQuery());
    searchManager.reset();
    mocks.mediaQueryManager.maxMd = true;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });
  test.afterEach(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  test('keeps the filter area scrollable and the footer outside it', async () => {
    const { baseElement } = await render(SearchBarTestWrapper, { grayTheme: false, lockMobilePageScroll: true });
    (baseElement.querySelector('[role="combobox"]') as HTMLElement).focus();
    await tick();
    const panel = baseElement.querySelector('[data-testid="search-filter-panel"]')!;
    const scrollArea = baseElement.querySelector('[data-testid="search-filter-scroll-area"]')!;
    const footer = baseElement.querySelector('[data-testid="search-filter-footer"]')!;
    expect(panel.classList.contains('max-md:flex')).toBe(true);
    expect(panel.classList.contains('max-md:overflow-hidden')).toBe(true);
    expect(scrollArea.classList.contains('max-md:overflow-y-auto')).toBe(true);
    expect(scrollArea.contains(footer)).toBe(false);
    expect(footer.classList.contains('max-md:shrink-0')).toBe(true);
  });

  test('locks mobile page scrolling while open and restores it on unmount', async () => {
    const { baseElement, unmount } = await render(SearchBarTestWrapper, { grayTheme: false, lockMobilePageScroll: true });
    (baseElement.querySelector('[role="combobox"]') as HTMLElement).focus();
    await tick();
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');
    await unmount();
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
  });

  test('does not lock page scrolling on desktop', async () => {
    mocks.mediaQueryManager.maxMd = false;
    const { baseElement } = await render(SearchBarTestWrapper, { grayTheme: false, lockMobilePageScroll: true });
    (baseElement.querySelector('[role="combobox"]') as HTMLElement).focus();
    await tick();
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
  });
});
