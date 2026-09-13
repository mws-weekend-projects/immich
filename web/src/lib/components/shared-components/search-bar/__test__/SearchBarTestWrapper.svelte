<script lang="ts">
  import { TooltipProvider } from '@immich/ui';
  import type { ComponentProps } from 'svelte';
  import SearchBar from '../SearchBar.svelte';

  type Props = ComponentProps<typeof SearchBar>;

  let props: Props = $props();
</script>

<TooltipProvider>
  <SearchBar {...props} />
</TooltipProvider>
