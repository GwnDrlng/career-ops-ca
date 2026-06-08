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

/** Strip a full HTML page down to its main content for in-panel display. */
export function extractHtmlContent(html: string): string {
	if (typeof window === 'undefined') return html;
	const doc = new DOMParser().parseFromString(html, 'text/html');
	doc.querySelectorAll('script, style, link').forEach(el => el.remove());
	doc.querySelectorAll('nav, aside, header, .sb, #sb, #pb').forEach(el => el.remove());
	const main = doc.querySelector('main') ?? doc.body;
	return DOMPurify.sanitize(main.innerHTML);
}

/** Wrap rendered markdown content in a full standalone HTML page with a polished dark design. */
export function wrapAsHtmlPage(mdContent: string, title = 'Interview Prep'): string {
	const body = renderMarkdown(mdContent);
	const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#07090f;--bg-s:#0c0f1a;--bg-e:#101422;
  --b:rgba(255,255,255,0.06);
  --acc:#7c6af5;--acc-d:rgba(124,106,245,0.08);--acc-b:rgba(124,106,245,0.28);
  --ok:#3aab72;--warn:#d4974a;--gold:#f0c060;
  --t:#dce8f8;--t2:#8da3c8;--t3:#4d617e;
  --sans:'Outfit',system-ui,sans-serif;
  --mono:'JetBrains Mono',monospace;
}
html{scroll-behavior:smooth}
body{font-family:var(--sans);background:var(--bg);color:var(--t);line-height:1.7;-webkit-font-smoothing:antialiased;padding:48px 24px 96px}
.wrap{max-width:860px;margin:0 auto}
h1{font-size:28px;font-weight:700;letter-spacing:-.02em;color:var(--t);margin:0 0 16px}
h2{font-size:19px;font-weight:600;color:var(--t);margin:44px 0 16px;padding-bottom:10px;border-bottom:1px solid var(--b)}
h3{font-size:15px;font-weight:600;color:var(--acc);margin:30px 0 10px}
h4{font-size:13px;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.06em;margin:22px 0 8px;font-family:var(--mono)}
p{color:var(--t2);margin:0 0 14px;line-height:1.7}
ul,ol{color:var(--t2);padding-left:22px;margin:0 0 14px}
li{margin-bottom:6px;line-height:1.65}
li>ul,li>ol{margin-top:6px;margin-bottom:0}
strong{color:var(--t);font-weight:600}
em{color:var(--t2)}
code{font-family:var(--mono);font-size:12px;background:var(--acc-d);color:var(--acc);padding:2px 7px;border-radius:4px;border:1px solid var(--acc-b)}
pre{background:var(--bg-s);border:1px solid var(--b);border-radius:8px;padding:18px 22px;overflow-x:auto;margin:0 0 20px}
pre code{background:none;border:none;padding:0;color:var(--t2);font-size:13px}
blockquote{border-left:3px solid var(--acc);padding:12px 20px;background:var(--acc-d);border-radius:0 8px 8px 0;margin:0 0 20px}
blockquote p{margin:0;color:var(--t2)}
table{width:100%;border-collapse:collapse;margin:0 0 24px;font-size:13px;font-family:var(--mono)}
th{text-align:left;padding:10px 14px;border-bottom:2px solid rgba(255,255,255,0.1);color:var(--t3);font-size:10px;text-transform:uppercase;letter-spacing:.1em}
td{padding:10px 14px;border-bottom:1px solid var(--b);color:var(--t2);vertical-align:top}
tr:hover td{background:rgba(255,255,255,0.02)}
a{color:var(--acc);text-decoration:none}
a:hover{text-decoration:underline}
hr{border:none;border-top:1px solid var(--b);margin:44px 0}
</style>
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>`;
}
