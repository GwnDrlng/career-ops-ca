<script lang="ts">
	import type { OfferDTO } from '$lib/types';
	import { scoreCls } from '$lib/utils/score';
	import { renderMarkdown, extractHtmlContent, wrapAsHtmlPage } from '$lib/utils/markdown';
	import { updateOfferState, fetchOffer, updateOfferLoc, fetchFileContent } from '$lib/api';
	import { offers, states, view, evalSize, pipeSize } from '$lib/stores';

	function focusOnMount(el: HTMLElement) { el.focus(); }

	interface Props { offer: OfferDTO | null; }
	let { offer }: Props = $props();

	let reportMD = $state<string | null>(null);
	let loadingReport = $state(false);
	let generatingPDF = $state(false);
	let editingLoc = $state(false);
	let locDraft = $state('');

	// Related files tab state
	let activeTab = $state<'report' | string>('report');
	let relatedContent = $state<Record<string, string>>({});
	let loadingFile = $state(false);

	$effect(() => {
		if (!offer) { reportMD = null; activeTab = 'report'; return; }
		activeTab = 'report';
		if (offer.report_md) { reportMD = offer.report_md; return; }
		loadingReport = true;
		fetchOffer(offer.n).then(full => {
			reportMD = full.report_md ?? null;
			loadingReport = false;
		}).catch(() => { loadingReport = false; });
	});

	async function selectTab(tab: string) {
		activeTab = tab;
		if (tab === 'report') return;
		if (relatedContent[tab]) return;
		loadingFile = true;
		try {
			const result = await fetchFileContent(tab);
			relatedContent = { ...relatedContent, [tab]: result.content };
		} finally {
			loadingFile = false;
		}
	}

	function tabLabel(path: string): string {
		const name = path.split('/').pop() ?? path;
		// Strip company prefix up to first dash, then truncate
		const parts = name.replace(/\.(md|html)$/, '').split('-');
		// Drop first segment (company slug) and join rest
		const label = parts.slice(1).join(' ');
		return label.length > 0 ? label : name;
	}

	const rendered = $derived(() => {
		if (activeTab === 'report') return reportMD ? renderMarkdown(reportMD) : '';
		const content = relatedContent[activeTab];
		if (!content) return '';
		if (activeTab.endsWith('.html')) return extractHtmlContent(content);
		return renderMarkdown(content);
	});

	async function openInNewTab(path: string) {
		let content = relatedContent[path];
		if (!content) {
			const result = await fetchFileContent(path);
			relatedContent = { ...relatedContent, [path]: result.content };
			content = result.content;
		}
		const html = path.endsWith('.html') ? content : wrapAsHtmlPage(content, tabLabel(path));
		const blob = new Blob([html], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		window.open(url, '_blank');
	}

	function legitimacyCls(l: string) {
		if (l?.toLowerCase().includes('high')) return 'ok';
		if (l?.toLowerCase().includes('low'))  return 'bad';
		return 'warn';
	}

	async function changeState(newState: string) {
		if (!offer) return;
		const oldState = offer.state;
		const updated = await updateOfferState(offer.n, newState);
		offers.update(list => list.map(o => o.n === updated.n ? { ...o, state: updated.state } : o));
		states.update(list => list.map(s => {
			if (s.id === oldState)       return { ...s, count: Math.max(0, s.count - 1) };
			if (s.id === updated.state)  return { ...s, count: s.count + 1 };
			return s;
		}));
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
			<span class="score {scoreCls(offer.score)}" style="margin-left:8px">{offer.score > 0 ? offer.score.toFixed(1) : '—'}</span>
			<div class="right">
				<span class="status-pill {offer.state}">{offer.state}</span>
				{#if offer.url}
					<a href={offer.url} target="_blank" rel="noopener" class="icon-btn" title="Open posting">↗</a>
				{/if}
				<button class="icon-btn {$view === 'report' ? 'primary' : ''}" onclick={() => view.set('report')} title="Report view">✎</button>
				<button class="icon-btn {$view === 'files'  ? 'primary' : ''}" onclick={() => view.set('files')}  title="Files view">⟦⟧</button>
				<button class="icon-btn" title={offer.state === 'applied' ? 'Undo applied' : 'Mark applied'}
					onclick={() => changeState(offer.state === 'applied' ? 'evaluated' : 'applied')}>✓</button>
				<button class="icon-btn" title={offer.state === 'skip' ? 'Undo skip' : 'Skip'}
					onclick={() => changeState(offer.state === 'skip' ? 'evaluated' : 'skip')}>⦸</button>
				<button class="icon-btn" title={offer.state === 'discarded' ? 'Undo discard' : 'Discard'}
					onclick={() => changeState(offer.state === 'discarded' ? 'evaluated' : 'discarded')}>✕</button>
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

		{#if offer.related_files && offer.related_files.length > 0}
			<div class="tab-strip">
				<button class="tab-btn {activeTab === 'report' ? 'active' : ''}" onclick={() => selectTab('report')}>
					Report
				</button>
				{#each offer.related_files as path}
					<span class="tab-item {activeTab === path ? 'active' : ''}">
						<button class="tab-btn {activeTab === path ? 'active' : ''}" onclick={() => selectTab(path)} title={path}>
							{tabLabel(path)}
						</button>
						<button class="tab-open" onclick={(e) => { e.stopPropagation(); openInNewTab(path); }} title="Open in new tab">↗</button>
					</span>
				{/each}
			</div>
		{/if}

		{#if loadingReport || loadingFile}
			<div style="padding:40px 24px;color:var(--fg-3);font-family:var(--mono);font-size:12px">Loading…</div>
		{:else if rendered()}
			<div class="report">{@html rendered()}</div>
		{:else if activeTab === 'report' && offer.notes}
			<div class="report" style="padding:28px 36px">
				<p style="color:var(--fg-2)">{offer.notes}</p>
				{#if !offer.report}
					<p style="color:var(--fg-3);font-size:12px;margin-top:20px">No report file found.</p>
				{/if}
			</div>
		{:else}
			<div style="padding:40px 24px;color:var(--fg-3);font-family:var(--mono);font-size:12px">No content available.</div>
		{/if}
	{/if}
</div>
