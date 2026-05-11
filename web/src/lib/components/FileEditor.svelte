<script lang="ts">
	import type { FileNodeDTO } from '$lib/types';
	import { openPath, dirty, fileContent } from '$lib/stores';
	import { fetchFileContent, saveFile } from '$lib/api';
	import { renderMarkdown } from '$lib/utils/markdown';

	interface Props {
		files: FileNodeDTO[];
	}
	let { files }: Props = $props();

	let localContent = $state('');
	let loading = $state(false);

	// Load file content when openPath changes
	$effect(() => {
		const path = $openPath;
		const cached = $fileContent[path];
		if (cached !== undefined) {
			localContent = cached;
			return;
		}
		loading = true;
		fetchFileContent(path).then(res => {
			fileContent.update(m => ({ ...m, [path]: res.content }));
			localContent = res.content;
			loading = false;
		}).catch(() => {
			localContent = '# Error loading file';
			loading = false;
		});
	});

	function onInput(e: Event) {
		const val = (e.target as HTMLTextAreaElement).value;
		localContent = val;
		fileContent.update(m => ({ ...m, [$openPath]: val }));
		dirty.update(d => ({ ...d, [$openPath]: true }));
	}

	async function save() {
		if (!$dirty[$openPath]) return;
		await saveFile($openPath, localContent);
		dirty.update(d => ({ ...d, [$openPath]: false }));
	}

	function isMarkdown(path: string) {
		return path.endsWith('.md');
	}

	const preview = $derived(() => {
		if (!isMarkdown($openPath)) return '';
		return renderMarkdown(localContent);
	});

	// Group files by directory
	const fileGroups = $derived(() => {
		const map = new Map<string, FileNodeDTO[]>();
		files.forEach(f => {
			const dir = f.path.includes('/') ? f.path.split('/')[0] : '·';
			if (!map.has(dir)) map.set(dir, []);
			map.get(dir)!.push(f);
		});
		return [...map.entries()];
	});
</script>

<div style="display:flex;flex:1 1 auto;min-height:0;overflow:hidden">
	<!-- File tree -->
	<div style="width:180px;flex-shrink:0;border-right:1px solid var(--line);overflow-y:auto;background:var(--bg-2)">
		<div class="side-label">Files</div>
		{#each fileGroups() as [dir, items]}
			<div style="padding:6px 0">
				<div style="padding:4px 12px;font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-3)">{dir}</div>
				{#each items as f}
					<button
						style="display:flex;align-items:center;gap:6px;width:100%;padding:4px 12px 4px 20px;font-family:var(--mono);font-size:11px;color:{$openPath===f.path ? 'var(--fg)' : 'var(--fg-2)'};background:{$openPath===f.path ? 'var(--accent-soft)' : 'transparent'};border:none;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
						onclick={() => openPath.set(f.path)}
					>
						<span style="color:var(--fg-3)">{f.icon}</span>
						<span style="overflow:hidden;text-overflow:ellipsis">{f.path.split('/').pop()}</span>
						{#if $dirty[f.path]}<span class="dirty-dot"></span>{/if}
					</button>
				{/each}
			</div>
		{/each}
	</div>

	<!-- Editor + preview -->
	<div style="display:flex;flex-direction:column;flex:1 1 auto;min-width:0;min-height:0">
		<div class="file-tabs">
			<button class="ft active" style="cursor:default">
				<span class="icon">✎</span>
				<span>{$openPath.split('/').pop()}</span>
				{#if $dirty[$openPath]}<span class="dirty-dot"></span>{/if}
			</button>
		</div>

		<div class="file-pane {isMarkdown($openPath) ? '' : 'single'}">
			<div class="editor-side">
				<div class="side-label">
					Edit
					<div class="actions">
						<button
							class="icon-btn {$dirty[$openPath] ? 'primary' : ''}"
							onclick={save}
							disabled={!$dirty[$openPath]}
							title="Save (⌘S)"
						>💾</button>
					</div>
				</div>
				{#if loading}
					<div style="padding:16px 18px;color:var(--fg-3);font-family:var(--mono);font-size:12px">Loading…</div>
				{:else}
					<textarea
						class="editor-textarea"
						value={localContent}
						oninput={onInput}
					></textarea>
				{/if}
			</div>

			{#if isMarkdown($openPath)}
				<div class="preview-side">
					<div class="side-label">Preview</div>
					<div class="preview-body markdown report">
						{@html preview()}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
