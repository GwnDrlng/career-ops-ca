export interface OfferDTO {
	n: number;
	score: number;
	date: string;
	company: string;
	title: string;
	state: string;
	archetype: string;
	legitimacy: string;
	loc: string;
	comp: string;
	url: string;
	notes: string;
	report: string;
	report_md?: string;
}

export interface FileNodeDTO {
	path: string;
	lang: string;
	icon: string;
}

export interface MetaDTO {
	user: string;
	project: string;
	version: string;
	avgScore: number;
	totalOffers: number;
	generated: string;
	candidate: string;
	location: string;
}

export interface StateCountDTO {
	id: string;
	label: string;
	count: number;
	color: string;
}

export interface OffersResponseDTO {
	meta: MetaDTO;
	states: StateCountDTO[];
	offers: OfferDTO[];
}

export interface FileContentDTO {
	path: string;
	content: string;
}

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	tool?: string;
}
