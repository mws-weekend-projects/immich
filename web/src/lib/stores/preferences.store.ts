import { persisted } from 'svelte-persisted-store';
import { browser } from '$app/environment';
import { defaultLang } from '$lib/constants';
import { convertBCP47, getPreferredLocale } from '$lib/utils/i18n';

// Locale to use for formatting dates, numbers, etc.
export const locale = persisted('locale', 'default', {
  serializer: {
    parse: (text) => convertBCP47(text) || 'default',
    stringify: (object) => object ?? '',
  },
});

const preferredLocale = browser ? getPreferredLocale() : undefined;
export const lang = persisted<string>('lang', preferredLocale || defaultLang.code, {
  serializer: {
    parse: (text) => convertBCP47(text),
    stringify: (object) => object ?? '',
  },
});

export interface MapSettings {
  allowDarkMode: boolean;
  includeArchived: boolean;
  onlyFavorites: boolean;
  withPartners: boolean;
  withSharedAlbums: boolean;
  showAssetPanel: boolean;
  relativeDate: string;
  dateAfter?: string;
  dateBefore?: string;
}

const defaultMapSettings = {
  allowDarkMode: true,
  includeArchived: false,
  onlyFavorites: false,
  withPartners: false,
  withSharedAlbums: false,
  showAssetPanel: false,
  relativeDate: '',
};

const persistedObject = <T>(key: string, defaults: T) =>
  persisted<T>(key, defaults, {
    serializer: {
      parse: (text) => ({ ...defaults, ...JSON.parse(text ?? null) }),
      stringify: JSON.stringify,
    },
  });

export const mapSettings = persistedObject<MapSettings>('map-settings', defaultMapSettings);

export interface AlbumViewSettings {
  view: string;
  filter: string;
  groupBy: string;
  groupOrder: string;
  sortBy: string;
  sortOrder: string;
  collapsedGroups: {
    // Grouping Option => Array<Group ID>
    [group: string]: string[];
  };
}

export interface PlacesViewSettings {
  groupBy: string;
  collapsedGroups: {
    // Grouping Option => Array<Group ID>
    [group: string]: string[];
  };
}

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

export enum AlbumViewMode {
  Cover = 'Cover',
  List = 'List',
}

export enum AlbumFilter {
  All = 'All',
  Owned = 'Owned',
  Shared = 'Shared',
}

export enum AlbumGroupBy {
  None = 'None',
  Year = 'Year',
  Owner = 'Owner',
}

export enum AlbumSortBy {
  Title = 'Title',
  ItemCount = 'ItemCount',
  DateModified = 'DateModified',
  DateCreated = 'DateCreated',
  MostRecentPhoto = 'MostRecentPhoto',
  OldestPhoto = 'OldestPhoto',
}

export const albumViewSettings = persisted<AlbumViewSettings>('album-view-settings', {
  view: AlbumViewMode.Cover,
  filter: AlbumFilter.All,
  groupBy: AlbumGroupBy.Year,
  groupOrder: SortOrder.Desc,
  sortBy: AlbumSortBy.MostRecentPhoto,
  sortOrder: SortOrder.Desc,
  collapsedGroups: {},
});

export enum PlacesGroupBy {
  None = 'None',
  Country = 'Country',
}

export const placesViewSettings = persisted<PlacesViewSettings>('places-view-settings', {
  groupBy: PlacesGroupBy.None,
  collapsedGroups: {},
});

export const showDeleteModal = persisted<boolean>('delete-confirm-dialog', true, {});

export const alwaysLoadOriginalFile = persisted<boolean>('always-load-original-file', false, {});

export const playVideoThumbnailOnHover = persisted<boolean>('play-video-thumbnail-on-hover', true, {});

export const loopVideo = persisted<boolean>('loop-video', true, {});

export const autoPlayVideo = persisted<boolean>('auto-play-video', true, {});

export const alwaysLoadOriginalVideo = persisted<boolean>('always-load-original-video', false, {});

export const recentAlbumsDropdown = persisted<boolean>('recent-albums-open', true, {});

export type AssetMetadataField =
  'dateTime' | 'fileName' | 'path' | 'camera' | 'dimensions' | 'fileSize' | 'lens' | 'exposure';

export type AssetMetadataOverlayMode = 'off' | 'compact' | 'detailed';

export type AssetMetadataModeSettings = {
  enabled: AssetMetadataField[];
  order: AssetMetadataField[];
  showLabels: boolean;
};

export type AssetMetadataOverlaySettings = {
  mode: AssetMetadataOverlayMode;
  delayMs: number;
  compact: AssetMetadataModeSettings;
  detailed: AssetMetadataModeSettings;
};

const assetMetadataFields: AssetMetadataField[] = [
  'dateTime',
  'fileName',
  'path',
  'camera',
  'dimensions',
  'fileSize',
  'lens',
  'exposure',
];

const defaultAssetMetadataOverlaySettings: AssetMetadataOverlaySettings = {
  mode: 'off',
  delayMs: 350,
  compact: {
    enabled: ['dateTime', 'camera', 'path'],
    order: assetMetadataFields,
    showLabels: true,
  },
  detailed: {
    enabled: assetMetadataFields,
    order: assetMetadataFields,
    showLabels: true,
  },
};

const normalizeAssetMetadataModeSettings = (
  value: Partial<AssetMetadataModeSettings> | undefined,
  defaults: AssetMetadataModeSettings,
): AssetMetadataModeSettings => {
  const order = [...(value?.order ?? []), ...defaults.order].filter(
    (field, index, fields): field is AssetMetadataField =>
      assetMetadataFields.includes(field) && fields.indexOf(field) === index,
  );
  const enabled = [...(value?.enabled ?? defaults.enabled)].filter(
    (field, index, fields): field is AssetMetadataField =>
      assetMetadataFields.includes(field) && fields.indexOf(field) === index,
  );

  return { order, enabled, showLabels: value?.showLabels ?? defaults.showLabels };
};

export const assetMetadataOverlaySettings = persisted<AssetMetadataOverlaySettings>(
  'asset-metadata-overlay-settings',
  defaultAssetMetadataOverlaySettings,
  {
    serializer: {
      parse: (text) => {
        const value = JSON.parse(text ?? 'null') as Partial<AssetMetadataOverlaySettings> | null;
        return {
          ...defaultAssetMetadataOverlaySettings,
          ...value,
          compact: normalizeAssetMetadataModeSettings(value?.compact, defaultAssetMetadataOverlaySettings.compact),
          detailed: normalizeAssetMetadataModeSettings(value?.detailed, defaultAssetMetadataOverlaySettings.detailed),
        };
      },
      stringify: JSON.stringify,
    },
  },
);
