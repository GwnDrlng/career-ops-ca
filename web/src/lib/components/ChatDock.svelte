<script lang="ts">
	import type { OfferDTO } from '$lib/types';
	import { chatLog } from '$lib/stores';

	interface Props {
		activeOffer: OfferDTO | null;
	}
	let { activeOffer }: Props = $props();

	let input = $state('');
	let scrollEl: HTMLDivElement;

	const suggestions = [
		'Evaluate top offers',
		'Generate CV for #5',
		'Scan portals',
		'Show pattern analysis',
	];

	function send() {
		const msg = input.trim();
		if (!msg) return;
		chatLog.update(log => [...log, { role: 'user', content: msg }]);
		input = '';
		// Stub: echo a placeholder assistant reply
		setTimeout(() => {
			chatLog.update(log => [...log, {
				role: 'assistant',
				content: 'Chat passthrough to Claude Code is not yet wired. Run `career-ops` in your terminal to interact with the AI.'
			}]);
		}, 400);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	$effect(() => {
		$chatLog; // reactive dependency
		if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
	});
</script>

<div class="chat" style="flex:1;min-height:0">
	<div class="scroll" bind:this={scrollEl}>
		{#each $chatLog as msg}
			<div class="msg {msg.role === 'user' ? 'user' : 'bot'}">
				<div class="who">{msg.role === 'user' ? 'you' : 'claude'}</div>
				<div class="bubble">{msg.content}</div>
				{#if msg.tool}
					<div class="tool">▸ {msg.tool}</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="suggestions">
		{#each suggestions as s}
			<button class="sg" onclick={() => { input = s; }}>/{s}</button>
		{/each}
	</div>

	<div class="composer">
		<textarea
			bind:value={input}
			placeholder={activeOffer ? `Ask about #${activeOffer.n} ${activeOffer.company}…` : 'Ask career-ops anything…'}
			rows="1"
			onkeydown={onKeydown}
		></textarea>
		<button class="send" onclick={send}>Send</button>
	</div>
</div>
