<script lang="ts">
  import BrokenAsset from '$lib/components/assets/BrokenAsset.svelte';
  import Image from '$lib/components/Image.svelte';
  import { Icon } from '@immich/ui';
  import { mdiEyeOffOutline } from '@mdi/js';
  import type { ClassValue } from 'svelte/elements';

  interface Props {
    url: string;
    fallbackUrls?: string[];
    altText: string | undefined;
    title?: string | null;
    heightStyle?: string | undefined;
    widthStyle: string;
    curve?: boolean;
    shadow?: boolean;
    circle?: boolean;
    hidden?: boolean;
    border?: boolean;
    highlighted?: boolean;
    hiddenIconClass?: string;
    class?: ClassValue;
    brokenAssetClass?: ClassValue;
    preload?: boolean;
    onComplete?: ((errored: boolean) => void) | undefined;
  }

  let {
    url,
    fallbackUrls = [],
    altText,
    title = null,
    heightStyle = undefined,
    widthStyle,
    curve = false,
    shadow = false,
    circle = false,
    hidden = false,
    border = false,
    highlighted = false,
    hiddenIconClass = 'text-white',
    onComplete = undefined,
    class: imageClass = '',
    brokenAssetClass = '',
    preload = true,
  }: Props = $props();

  let loaded = $state(false);
  let errored = $state(false);
  let fallbackIndex = $state(0);
  let activeUrl = $state(url);

  let candidateUrls = $derived([url, ...fallbackUrls].filter(Boolean));

  $effect(() => {
    // Reset the fallback chain when the asset URL changes.
    candidateUrls;
    activeUrl = url;
    fallbackIndex = 0;
    loaded = false;
    errored = false;
  });

  const setLoaded = () => {
    loaded = true;
    onComplete?.(false);
  };

  const setErrored = () => {
    if (fallbackIndex < candidateUrls.length - 1) {
      fallbackIndex += 1;
      activeUrl = candidateUrls[fallbackIndex];
      loaded = false;
      return;
    }

    errored = true;
    onComplete?.(true);
  };

  let sharedClasses = $derived([
    curve && 'rounded-xl',
    circle && 'rounded-full',
    shadow && 'shadow-lg',
    (circle || !heightStyle) && 'aspect-square',
    border && 'border-3 border-immich-dark-primary/80 hover:border-immich-primary',
    'transition-shadow duration-150',
    highlighted && 'ring-4 ring-immich-primary dark:ring-immich-dark-primary',
  ]);

  let style = $derived(
    `width: ${widthStyle}; height: ${heightStyle ?? ''}; filter: ${hidden ? 'grayscale(50%)' : 'none'}; opacity: ${hidden ? '0.5' : '1'};`,
  );
</script>

{#if errored}
  <BrokenAsset class={[sharedClasses, brokenAssetClass]} width={widthStyle} height={heightStyle} />
{:else}
  {#key activeUrl}
    <Image
      src={activeUrl}
      onLoad={setLoaded}
      onError={setErrored}
      class={['bg-gray-300 object-cover dark:bg-gray-700', sharedClasses, imageClass]}
      {style}
      alt={loaded || errored ? altText : ''}
      draggable={false}
      title={title ?? undefined}
      loading={preload ? 'eager' : 'lazy'}
    />
  {/key}
{/if}

{#if hidden}
  <div class="absolute inset-s-1/2 top-1/2 translate-[-50%] transform">
    <!-- TODO fix `title` type -->
    <Icon title={title ?? undefined} icon={mdiEyeOffOutline} size="2em" class={hiddenIconClass} />
  </div>
{/if}
