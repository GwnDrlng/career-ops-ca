<script lang="ts">
	import type { StateCountDTO } from '$lib/types';
	import { activeState } from '$lib/stores';

	interface Props {
		states: StateCountDTO[];
	}
	let { states }: Props = $props();
</script>

<div class="statebar" role="tablist">
	{#each states as s}
		<button
			class="tab {$activeState === s.id ? 'active' : ''}"
			role="tab"
			aria-selected={$activeState === s.id}
			onclick={() => activeState.set(s.id)}
		>
			{s.label}
			<span class="count">{s.count}</span>
		</button>
	{/each}
</div>
