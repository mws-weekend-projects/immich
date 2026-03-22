import { hiddenPathFilters, showHiddenPathFilters } from '$lib/stores/preferences.store';
import { get } from 'svelte/store';

export const parseHiddenPathFilters = (value: string): string[] => {
  const unique = new Set<string>();
  for (const entry of value.split(/\r?\n|,|;/)) {
    const trimmed = entry.trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }

  return [...unique];
};

export const getActiveExcludePaths = (): string[] | undefined => {
  if (get(showHiddenPathFilters)) {
    return undefined;
  }

  const filters = parseHiddenPathFilters(get(hiddenPathFilters));
  return filters.length > 0 ? filters : undefined;
};
