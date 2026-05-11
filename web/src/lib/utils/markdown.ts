import { marked, type Tokens } from 'marked';
import DOMPurify from 'dompurify';

const renderer = new marked.Renderer();

// Override to preserve our CSS class-based styling
renderer.table = ({ header, rows }: Tokens.Table) => {
	const headerCells = header.map((h: Tokens.TableCell) =>
		`<th>${marked.parseInline(h.text)}</th>`
	).join('');
	const bodyRows = rows.map((row: Tokens.TableCell[]) =>
		`<tr>${row.map((cell: Tokens.TableCell) => `<td>${marked.parseInline(cell.text)}</td>`).join('')}</tr>`
	).join('');
	return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
};

renderer.blockquote = ({ text }: Tokens.Blockquote) =>
	`<blockquote>${text}</blockquote>`;

renderer.code = ({ text, lang }: Tokens.Code) =>
	`<pre><code class="language-${lang ?? ''}">${text}</code></pre>`;

marked.use({ renderer, breaks: true, gfm: true });

export function renderMarkdown(src: string): string {
	const raw = marked.parse(src) as string;
	if (typeof window !== 'undefined') {
		return DOMPurify.sanitize(raw);
	}
	return raw;
}
