<script lang="ts">
	import type { OfferDTO } from '$lib/types';
	import { activeId, activeState } from '$lib/stores';
	import { scoreCls } from '$lib/utils/score';

	interface Props {
		offers: OfferDTO[];
	}
	let { offers }: Props = $props();

	const filtered = $derived(() => {
		const state = $activeState;
		if (state === 'all') return offers;
		if (state === 'top') return offers.filter(o => o.score >= 4.0);
		return offers.filter(o => o.state === state);
	});
</script>

<div class="list">
	{#each filtered() as o}
		<div
			style="display:grid;grid-template-columns:34px 32px 1fr;gap:8px;padding:0 10px;align-items:center;height:var(--row-h-compact);cursor:pointer;border-bottom:1px solid transparent;font-family:var(--mono);font-size:12px;border-left:2px solid {$activeId===o.n ? 'var(--accent)' : 'transparent'};background:{$activeId===o.n ? 'var(--accent-soft)' : 'transparent'}"
			onclick={() => activeId.set(o.n)}
			role="button"
			tabindex="0"
			onkeydown={e => e.key === 'Enter' && activeId.set(o.n)}
		>
			<span style="color:var(--accent)">#{o.n}</span>
			<span class="score {scoreCls(o.score)}">{o.score.toFixed(1)}</span>
			<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
				<b style="color:var(--fg)">{o.company}</b>
				<span style="color:var(--fg-3)"> · {o.title}</span>
			</span>
		</div>
	{/each}
</div>
