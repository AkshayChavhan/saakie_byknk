/**
 * A small Markdown renderer for blog post bodies.
 *
 * Posts are authored as Markdown in the admin dashboard and stored as source,
 * so the text stays portable if the editor is ever replaced. This turns that
 * source into HTML for `dangerouslySetInnerHTML`.
 *
 * Safety rests on one rule: **the source is HTML-escaped before any Markdown
 * rule runs**, so every `<`, `&` and `"` in the author's text is inert by the
 * time tags are emitted. The only tags in the output are the ones this module
 * writes itself, and the only attribute values are URLs that cleared
 * `safeUrl()`. An admin pasting `<script>` gets the literal text, not a script.
 *
 * Deliberately not a full CommonMark implementation — it covers what a saree
 * blog needs (headings, emphasis, links, images, lists, quotes, rules, code)
 * and ignores the rest rather than guessing.
 */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * A URL safe to put in an `href`/`src`, or null to drop the link.
 *
 * Runs on already-escaped text, so quotes cannot break out of the attribute.
 * The scheme allow-list is what stops `javascript:` and `data:` payloads;
 * control characters are rejected outright because browsers strip them before
 * resolving a scheme, which would otherwise smuggle `java\nscript:` through.
 */
function safeUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(url)) return null;
  if (!/^(https?:\/\/|mailto:|\/|#)/i.test(url)) return null;
  return url;
}

// Placeholder delimiters for already-rendered inline constructs. Private Use
// Area, and `stripUnsafeChars` clears these out of the source first, so a
// placeholder can never collide with author text.
const TOKEN_OPEN = '\uE000';
const TOKEN_CLOSE = '\uE001';
const PARKED_TOKEN = /\uE000(\d+)\uE001/g;

/**
 * Drop characters that have no place in a post body: C0/C1 controls (bar tab
 * and newline) and the Private Use Area the placeholders live in. Pasting a
 * raw \uE000 must not be able to impersonate a parked construct.
 */
function stripUnsafeChars(source: string): string {
  // eslint-disable-next-line no-control-regex
  return source.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uE000-\uF8FF]/g, '');
}

/**
 * Inline rules, applied to a single already-escaped line.
 *
 * Images, links and code spans are rendered first and parked behind
 * placeholders, so the emphasis pass that follows cannot reach inside them:
 * without this, `` `**x**` `` would bold the contents of a code span, and a
 * `*` in a URL would corrupt an href it had already been written into.
 */
function renderInline(escaped: string): string {
  const parked: string[] = [];
  const park = (rendered: string) => {
    parked.push(rendered);
    return `${TOKEN_OPEN}${parked.length - 1}${TOKEN_CLOSE}`;
  };

  let html = escaped;

  // Images before links — `![alt](src)` also matches the link pattern.
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt: string, src: string) => {
    const url = safeUrl(src);
    if (!url) return match;
    return park(`<img src="${url}" alt="${alt}" loading="lazy" class="my-6 w-full rounded-2xl" />`);
  });

  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
    const url = safeUrl(href);
    if (!url) return match;
    // Off-site links open in a new tab; rel guards against tab-nabbing.
    const external = /^https?:\/\//i.test(url);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return park(
      `<a href="${url}"${attrs} class="text-rose-600 underline underline-offset-2 hover:text-rose-700">${label}</a>`
    );
  });

  html = html.replace(/`([^`]+)`/g, (_match, code: string) =>
    park(`<code class="rounded bg-gray-100 px-1.5 py-0.5 text-[0.9em] text-rose-700">${code}</code>`)
  );

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  // Restore what was parked, now that emphasis has run over the rest.
  return html.replace(PARKED_TOKEN, (_match, index: string) => parked[Number(index)]);
}

const HEADING_CLASSES: Record<number, string> = {
  2: 'mt-12 mb-4 text-2xl md:text-3xl font-bold text-gray-900',
  3: 'mt-8 mb-3 text-xl md:text-2xl font-bold text-gray-900',
  4: 'mt-6 mb-2 text-lg font-semibold text-gray-900',
};

/**
 * Render Markdown source to an HTML string.
 *
 * Block rules are line-based: a blank line ends the current block, and list
 * items / quote lines accumulate until interrupted.
 */
export function renderMarkdown(source: string): string {
  if (!source?.trim()) return '';

  const lines = escapeHtml(stripUnsafeChars(source)).replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];

  // Open multi-line block, flushed whenever the block type changes.
  let listItems: string[] = [];
  let listOrdered = false;
  let quoteLines: string[] = [];
  let paragraphLines: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    const tag = listOrdered ? 'ol' : 'ul';
    const listClass = listOrdered
      ? 'my-4 list-decimal space-y-2 pl-6 text-gray-700'
      : 'my-4 list-disc space-y-2 pl-6 text-gray-700';
    html.push(`<${tag} class="${listClass}">${listItems.join('')}</${tag}>`);
    listItems = [];
  };

  const flushQuote = () => {
    if (!quoteLines.length) return;
    html.push(
      `<blockquote class="my-6 border-l-4 border-rose-300 bg-rose-50/60 py-3 pl-5 pr-4 italic text-gray-700">${quoteLines.join(' ')}</blockquote>`
    );
    quoteLines = [];
  };

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    html.push(
      `<p class="my-4 leading-relaxed text-gray-700">${paragraphLines.join('<br />')}</p>`
    );
    paragraphLines = [];
  };

  const flushAll = () => {
    flushList();
    flushQuote();
    flushParagraph();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    const heading = /^(#{2,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      html.push(
        `<h${level} class="${HEADING_CLASSES[level]}">${renderInline(heading[2].trim())}</h${level}>`
      );
      continue;
    }

    if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
      flushAll();
      html.push('<hr class="my-10 border-gray-200" />');
      continue;
    }

    const quote = /^&gt;\s?(.*)$/.exec(trimmed);
    if (quote) {
      flushList();
      flushParagraph();
      quoteLines.push(renderInline(quote[1].trim()));
      continue;
    }

    const unordered = /^[-*+]\s+(.*)$/.exec(trimmed);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (unordered || ordered) {
      const nextOrdered = Boolean(ordered);
      // A change of list type starts a fresh list rather than mixing markers.
      if (listItems.length && nextOrdered !== listOrdered) flushList();
      flushQuote();
      flushParagraph();
      listOrdered = nextOrdered;
      const item = (unordered ?? ordered)![1].trim();
      listItems.push(`<li>${renderInline(item)}</li>`);
      continue;
    }

    flushList();
    flushQuote();
    paragraphLines.push(renderInline(trimmed));
  }

  flushAll();
  return html.join('');
}

/**
 * The post body as plain text — for meta descriptions and excerpts, where
 * markup would leak into the snippet.
 */
export function markdownToPlainText(source: string): string {
  if (!source?.trim()) return '';

  return source
    .replace(/\r\n?/g, '\n')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}&gt;\s?/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/gm, '')
    .replace(/^\s{0,3}(?:---+|\*\*\*+|___+)\s*$/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words a typical reader gets through in a minute. */
const WORDS_PER_MINUTE = 200;

/**
 * Reading time in whole minutes, floored at 1 so a short post never advertises
 * "0 min read". Computed once on save and stored, so the post list does not
 * have to ship every body just to print this.
 */
export function estimateReadMinutes(source: string): number {
  const words = markdownToPlainText(source).split(/\s+/).filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
