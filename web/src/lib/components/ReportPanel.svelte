<script lang="ts">
	import type { OfferDTO } from '$lib/types';
	import { scoreCls } from '$lib/utils/score';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { updateOfferState, fetchOffer, updateOfferLoc } from '$lib/api';
	import { offers, view, evalSize, pipeSize } from '$lib/stores';

	function focusOnMount(el: HTMLElement) { el.focus(); }

	interface Props { offer: OfferDTO | null; }
	let { offer }: Props = $props();

	let reportMD = $state<string | null>(null);
	let loadingReport = $state(false);
	let generatingPDF = $state(false);
	let editingLoc = $state(false);
	let locDraft = $state('');

	$effect(() => {
		if (!offer) { reportMD = null; return; }
		if (offer.report_md) { reportMD = offer.report_md; return; }
		loadingReport = true;
		fetchOffer(offer.n).then(full => {
			reportMD = full.report_md ?? null;
			loadingReport = false;
		}).catch(() => { loadingReport = false; });
	});

	const rendered = $derived(() => reportMD ? renderMarkdown(reportMD) : '');

	function legitimacyCls(l: string) {
		if (l?.toLowerCase().includes('high')) return 'ok';
		if (l?.toLowerCase().includes('low'))  return 'bad';
		return 'warn';
	}

	async function changeState(newState: string) {
		if (!offer) return;
		const updated = await updateOfferState(offer.n, newState);
		offers.update(list => list.map(o => o.n === updated.n ? { ...o, state: updated.state } : o));
	}

	async function requestPDF() {
		if (!offer || generatingPDF) return;
		generatingPDF = true;
		try {
			const { generatePDF } = await import('$lib/api');
			await generatePDF(offer.n);
			offers.update(list => list.map(o => o.n === offer!.n ? { ...o, has_pdf: true } : o));
		} finally {
			generatingPDF = false;
		}
	}

	function minimise() {
		evalSize.set('min');
		pipeSize.set('normal');
	}

	let submittingLoc = false;

	async function submitLoc() {
		if (submittingLoc) return;
		const val = locDraft.trim();
		if (!val || !offer) { editingLoc = false; locDraft = ''; return; }
		submittingLoc = true;
		const n = offer.n;
		// Optimistic update: show the typed value immediately
		offers.update(list => list.map(o => o.n === n ? { ...o, loc: val } : o));
		editingLoc = false;
		locDraft = '';
		try {
			const updated = await updateOfferLoc(n, val);
			offers.update(list => list.map(o => o.n === updated.n ? { ...o, loc: updated.loc } : o));
		} catch {
			// Revert on failure
			offers.update(list => list.map(o => o.n === n ? { ...o, loc: '' } : o));
		} finally {
			submittingLoc = false;
		}
	}

	function startEditLoc() {
		locDraft = '';
		editingLoc = true;
	}
</script>

<div class="panel panel-eval" style="flex:1;display:flex;flex-direction:column">
	<!-- Minimised strip -->
	<button class="panel-strip" onclick={() => evalSize.set('normal')} title="Restore evaluation">
		<span class="ico">◀</span>
		<span class="v-label">Evaluation{offer ? ` · #${offer.n} ${offer.company}` : ''}</span>
	</button>

	{#if !offer}
		<div class="panel-header">
			<span class="title">Evaluation</span>
			<div class="right">
				<button class="icon-btn {$view === 'report' ? 'primary' : ''}" onclick={() => view.set('report')} title="Report view">✎</button>
				<button class="icon-btn {$view === 'files'  ? 'primary' : ''}" onclick={() => view.set('files')}  title="Files view">⟦⟧</button>
				<button class="icon-btn" onclick={minimise} title="Minimise">▶</button>
			</div>
		</div>
		<div style="padding:40px 24px;color:var(--fg-3);font-family:var(--mono);font-size:12px">
			↑↓ select a posting from the pipeline.
		</div>
	{:else}
		<div class="panel-header">
			<span style="color:var(--red-2)">#{offer.n}</span>
			<span class="title">{offer.company} — {offer.title}</span>
			<span class="score {scoreCls(offer.score)}" style="margin-left:8px">{offer.score.toFixed(1)}</span>
			<div class="right">
				<span class="status-pill {offer.state}">{offer.state}</span>
				{#if offer.url}
					<a href={offer.url} target="_blank" rel="noopener" class="icon-btn" title="Open posting">↗</a>
				{/if}
				<button class="icon-btn {$view === 'report' ? 'primary' : ''}" onclick={() => view.set('report')} title="Report view">✎</button>
				<button class="icon-btn {$view === 'files'  ? 'primary' : ''}" onclick={() => view.set('files')}  title="Files view">⟦⟧</button>
				<button class="icon-btn" title={offer.state === 'applied' ? 'Undo applied' : 'Mark applied'}
					onclick={() => changeState(offer.state === 'applied' ? 'evaluated' : 'applied')}>✓</button>
				<button class="icon-btn" title="Skip" onclick={() => changeState('skip')}>⦸</button>
				<button class="icon-btn" title="Generate PDF" onclick={requestPDF} disabled={generatingPDF}>
					{generatingPDF ? '⏳' : '⎙'}
				</button>
				<button class="icon-btn" onclick={minimise} title="Minimise">▶</button>
			</div>
		</div>

		<div class="chiprow" style="padding:10px 14px;border-bottom:1px solid var(--line);background:var(--bg-1)">
			{#if offer.archetype}<span class="chip mono">{offer.archetype}</span>{/if}
			{#if offer.loc}
				<span class="chip mono">{offer.loc}</span>
			{:else if editingLoc}
				<input
					class="chip mono loc-input"
					placeholder="e.g. Remote · US"
					bind:value={locDraft}
					onkeydown={(e) => { if (e.key === 'Enter') submitLoc(); if (e.key === 'Escape') { editingLoc = false; locDraft = ''; } }}
					onblur={submitLoc}
					use:focusOnMount
				/>
			{:else}
				<button class="chip mono bad loc-unverified" title="Click to add location manually" onclick={startEditLoc}>
					⚠ location unverified
				</button>
			{/if}
			{#if offer.comp}<span class="chip mono">{offer.comp}</span>{/if}
			{#if offer.legitimacy}
				<span class="chip mono {legitimacyCls(offer.legitimacy)}">
					{offer.legitimacy.toLowerCase().includes('high') ? '●' : '◐'} {offer.legitimacy}
				</span>
			{/if}
		</div>

		{#if loadingReport}
			<div style="padding:40px 24px;color:var(--fg-3);font-family:var(--mono);font-size:12px">Loading report…</div>
		{:else if rendered()}
			<div class="report">{@html rendered()}</div>
		{:else if offer.notes}
			<div class="report" style="padding:28px 36px">
				<p style="color:var(--fg-2)">{offer.notes}</p>
				{#if !offer.report}
					<p style="color:var(--fg-3);font-size:12px;margin-top:20px">No report file found.</p>
				{/if}
			</div>
		{:else}
			<div style="padding:40px 24px;color:var(--fg-3);font-family:var(--mono);font-size:12px">No report available.</div>
		{/if}
	{/if}
</div>
