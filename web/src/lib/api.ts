import type { OffersResponseDTO, OfferDTO, FileNodeDTO, FileContentDTO } from './types';

const BASE = '/api';

async function json<T>(res: Response): Promise<T> {
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(err.error ?? res.statusText);
	}
	return res.json() as Promise<T>;
}

export async function fetchOffers(): Promise<OffersResponseDTO> {
	return json<OffersResponseDTO>(await fetch(`${BASE}/offers`));
}

export async function fetchOffer(n: number): Promise<OfferDTO> {
	return json<OfferDTO>(await fetch(`${BASE}/offers/${n}`));
}

export async function updateOfferState(n: number, state: string): Promise<OfferDTO> {
	return json<OfferDTO>(
		await fetch(`${BASE}/offers/${n}/state`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ state })
		})
	);
}

export async function fetchFiles(): Promise<FileNodeDTO[]> {
	return json<FileNodeDTO[]>(await fetch(`${BASE}/files`));
}

export async function fetchFileContent(path: string): Promise<FileContentDTO> {
	return json<FileContentDTO>(await fetch(`${BASE}/files/${path}`));
}

export async function saveFile(path: string, content: string): Promise<void> {
	await json<{ ok: boolean }>(
		await fetch(`${BASE}/files/${path}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ path, content })
		})
	);
}
