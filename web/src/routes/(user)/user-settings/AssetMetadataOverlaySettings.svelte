<script lang="ts">
  import {
    assetMetadataOverlaySettings,
    type AssetMetadataField,
    type AssetMetadataModeSettings,
    type AssetMetadataOverlayMode,
  } from '$lib/stores/preferences.store';
  import { Field, Icon, Switch } from '@immich/ui';
  import { mdiChevronDown, mdiChevronUp, mdiDragVertical } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type ConfigurableMode = Exclude<AssetMetadataOverlayMode, 'off'>;

  const modes: ConfigurableMode[] = ['compact', 'detailed'];

  let draggedField = $state<AssetMetadataField>();

  const getFieldLabel = (field: AssetMetadataField) => {
    switch (field) {
      case 'dateTime':
        return $t('date_and_time');
      case 'fileName':
        return $t('filename');
      case 'path':
        return $t('path');
      case 'camera':
        return $t('camera_model');
      case 'dimensions':
        return $t('asset_metadata_dimensions');
      case 'fileSize':
        return $t('file_size');
      case 'lens':
        return $t('lens_model');
      case 'exposure':
        return $t('exposure_time');
    }
  };

  const updateModeSettings = (mode: ConfigurableMode, update: Partial<AssetMetadataModeSettings>) => {
    $assetMetadataOverlaySettings = {
      ...$assetMetadataOverlaySettings,
      [mode]: {
        ...$assetMetadataOverlaySettings[mode],
        ...update,
      },
    };
  };

  const setMode = (event: Event) => {
    const mode = (event.currentTarget as HTMLSelectElement).value as AssetMetadataOverlayMode;
    $assetMetadataOverlaySettings = { ...$assetMetadataOverlaySettings, mode };
  };

  const setDelay = (event: Event) => {
    const delayMs = Number((event.currentTarget as HTMLSelectElement).value);
    $assetMetadataOverlaySettings = { ...$assetMetadataOverlaySettings, delayMs };
  };

  const toggleField = (mode: ConfigurableMode, field: AssetMetadataField) => {
    const modeSettings = $assetMetadataOverlaySettings[mode];
    const enabled = modeSettings.enabled.includes(field)
      ? modeSettings.enabled.filter((enabledField) => enabledField !== field)
      : [...modeSettings.enabled, field];
    updateModeSettings(mode, { enabled });
  };

  const moveField = (mode: ConfigurableMode, field: AssetMetadataField, offset: -1 | 1) => {
    const order = [...$assetMetadataOverlaySettings[mode].order];
    const index = order.indexOf(field);
    const target = index + offset;

    if (index < 0 || target < 0 || target >= order.length) {
      return;
    }

    [order[index], order[target]] = [order[target], order[index]];
    updateModeSettings(mode, { order });
  };

  const handleDragStart = (field: AssetMetadataField, event: DragEvent) => {
    draggedField = field;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', field);
    }
  };

  const handleDrop = (mode: ConfigurableMode, targetField: AssetMetadataField, event: DragEvent) => {
    event.preventDefault();
    const sourceField = (event.dataTransfer?.getData('text/plain') || draggedField) as AssetMetadataField | undefined;
    if (!sourceField || sourceField === targetField) {
      return;
    }

    const order = [...$assetMetadataOverlaySettings[mode].order];
    const sourceIndex = order.indexOf(sourceField);
    const targetIndex = order.indexOf(targetField);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    order.splice(sourceIndex, 1);
    order.splice(targetIndex, 0, sourceField);
    updateModeSettings(mode, { order });
    draggedField = undefined;
  };
</script>

<section class="mt-6 flex flex-col gap-4 border-t border-light-200 pt-6 dark:border-dark-600">
  <div>
    <h3 class="text-base font-medium">{$t('asset_metadata_overlay')}</h3>
    <p class="text-sm text-light-500 dark:text-dark-300">{$t('asset_metadata_overlay_description')}</p>
  </div>

  <Field label={$t('asset_metadata_overlay_mode')} description={$t('asset_metadata_overlay_mode_description')}>
    <select
      class="rounded-lg border border-light-300 bg-light px-3 py-2 text-sm dark:border-dark-500 dark:bg-dark-800"
      value={$assetMetadataOverlaySettings.mode}
      onchange={setMode}
    >
      <option value="off">{$t('asset_metadata_overlay_mode_off')}</option>
      <option value="compact">{$t('asset_metadata_overlay_compact')}</option>
      <option value="detailed">{$t('asset_metadata_overlay_detailed')}</option>
    </select>
  </Field>

  <Field label={$t('asset_metadata_overlay_delay')} description={$t('asset_metadata_overlay_delay_description')}>
    <select
      class="rounded-lg border border-light-300 bg-light px-3 py-2 text-sm dark:border-dark-500 dark:bg-dark-800"
      value={$assetMetadataOverlaySettings.delayMs}
      onchange={setDelay}
    >
      <option value="250">250 ms</option>
      <option value="350">350 ms</option>
      <option value="500">500 ms</option>
      <option value="750">750 ms</option>
    </select>
  </Field>

  {#each modes as mode}
    {@const modeSettings = $assetMetadataOverlaySettings[mode]}
    <div class="rounded-lg border border-light-200 p-4 dark:border-dark-600" data-testid={`metadata-settings-${mode}`}>
      <div class="mb-3">
        <h4 class="font-medium">
          {mode === 'compact' ? $t('asset_metadata_overlay_compact') : $t('asset_metadata_overlay_detailed')}
        </h4>
        <p class="text-sm text-light-500 dark:text-dark-300">{$t('asset_metadata_overlay_fields_description')}</p>
      </div>

      <div class="flex flex-col gap-1" role="list">
        {#each modeSettings.order as field, index (field)}
          <div
            class="flex items-center gap-2 rounded-md border border-transparent px-1 py-1 hover:border-light-200 dark:hover:border-dark-600"
            class:opacity-50={!modeSettings.enabled.includes(field)}
            role="listitem"
            ondragover={(event) => event.preventDefault()}
            ondrop={(event) => handleDrop(mode, field, event)}
          >
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="cursor-grab touch-none text-light-400 active:cursor-grabbing"
              aria-label={$t('drag_to_reorder')}
              draggable="true"
              ondragstart={(event) => handleDragStart(field, event)}
              ondragend={() => (draggedField = undefined)}
              title={$t('drag_to_reorder')}
            >
              <Icon icon={mdiDragVertical} size="20" />
            </div>
            <span class="min-w-0 flex-1 truncate text-sm">{getFieldLabel(field)}</span>
            <button
              type="button"
              class="rounded p-1 text-light-500 hover:bg-light-200 disabled:opacity-30 dark:hover:bg-dark-600"
              aria-label={$t('asset_metadata_move_up')}
              disabled={index === 0}
              onclick={() => moveField(mode, field, -1)}
            >
              <Icon icon={mdiChevronUp} size="18" />
            </button>
            <button
              type="button"
              class="rounded p-1 text-light-500 hover:bg-light-200 disabled:opacity-30 dark:hover:bg-dark-600"
              aria-label={$t('asset_metadata_move_down')}
              disabled={index === modeSettings.order.length - 1}
              onclick={() => moveField(mode, field, 1)}
            >
              <Icon icon={mdiChevronDown} size="18" />
            </button>
            <Switch checked={modeSettings.enabled.includes(field)} onCheckedChange={() => toggleField(mode, field)} />
          </div>
        {/each}
      </div>
    </div>
  {/each}
</section>
