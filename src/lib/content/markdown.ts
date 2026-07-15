/**
 * Minimal markdown → HTML renderer for article body content.
 * Handles: #, ##, ###, -, >, **bold**, *italic*, [text](url),
 * numbered lists, paragraph breaks, horizontal rules (---).
 *
 * Shared by article pages and service pages.
 * Styled to match AstroKalki's editorial dark palette.
 */

function inline(text: string): string {
  // Bold
  let out = text.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="text-[#f0eee9] font-normal">$1</strong>'
  );
  // Italic — careful, single * could be a list bullet but we already handled those
  out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>');
  // Links [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-[#c9a96e] underline decoration-[#c9a96e]/40 hover:decoration-[#c9a96e] underline-offset-4 transition-colors">$1</a>'
  );
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  let inBlockquote = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const closeBlockquote = () => {
    if (inBlockquote) {
      out.push("</blockquote>");
      inBlockquote = false;
    }
  };

  for (const raw of lines) {
    const line = raw;

    if (line.trim() === "") {
      closeList();
      closeBlockquote();
      continue;
    }

    if (line.trim() === "---") {
      closeList();
      closeBlockquote();
      out.push('<hr class="border-white/[0.08] my-12" />');
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      closeList();
      closeBlockquote();
      out.push(
        `<h3 class="text-xl sm:text-2xl font-serif text-[#f0eee9] mt-10 mb-4 font-light tracking-[-0.01em]">${inline(
          line.slice(4)
        )}</h3>`
      );
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      closeBlockquote();
      out.push(
        `<h2 class="text-2xl sm:text-3xl font-serif text-[#c9a96e] mt-14 mb-6 font-light tracking-[-0.015em]">${inline(
          line.slice(3)
        )}</h2>`
      );
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      closeBlockquote();
      out.push(
        `<h1 class="text-4xl sm:text-5xl md:text-6xl font-serif text-[#f0eee9] font-light tracking-[-0.025em] leading-[1.05] mb-6">${inline(
          line.slice(2)
        )}</h1>`
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      closeList();
      if (!inBlockquote) {
        out.push(
          '<blockquote class="border-l-2 border-[#c9a96e]/40 pl-6 my-8 italic text-[#cfcabf] font-serif text-lg">'
        );
        inBlockquote = true;
      }
      out.push(`<p class="mb-2">${inline(line.slice(2))}</p>`);
      continue;
    }

    // List item
    if (line.startsWith("- ")) {
      closeBlockquote();
      if (!inList) {
        out.push('<ul class="list-none space-y-3 my-6 pl-1">');
        inList = true;
      }
      out.push(
        `<li class="text-[#cfcabf] text-base sm:text-lg leading-[1.8] font-light flex gap-3"><span class="text-[#c9a96e] shrink-0">—</span><span>${inline(
          line.slice(2)
        )}</span></li>`
      );
      continue;
    }

    // Numbered list item (1. 2. 3.)
    if (/^\d+\.\s/.test(line)) {
      closeBlockquote();
      if (!inList) {
        out.push('<ul class="list-none space-y-3 my-6 pl-1">');
        inList = true;
      }
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        out.push(
          `<li class="text-[#cfcabf] text-base sm:text-lg leading-[1.8] font-light flex gap-3"><span class="text-[#c9a96e] shrink-0 font-mono text-sm pt-2">${match[1]}.</span><span>${inline(
            match[2]
          )}</span></li>`
        );
      }
      continue;
    }

    // Paragraph
    closeList();
    closeBlockquote();
    out.push(
      `<p class="text-[#cfcabf] text-base sm:text-lg leading-[1.85] font-light my-5">${inline(
        line
      )}</p>`
    );
  }
  closeList();
  closeBlockquote();

  return out.join("\n");
}
