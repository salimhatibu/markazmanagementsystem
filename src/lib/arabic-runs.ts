/**
 * Arabic, Arabic Supplement, Extended-A, and the presentation forms that carry
 * ﷺ and the honorific ligatures authors paste into posts.
 */
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** An Arabic span plus the punctuation and spaces sitting inside it. */
const RUN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u060C\u061B\u061F\u066A-\u066D\u06D4!.,:;"'()\-]*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]|[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

/**
 * Tags every Arabic run inside `root` with `lang="ar"` so screen readers switch
 * pronunciation engine instead of reading the Qur'an with English phonetics,
 * and `dir` so the bidi algorithm isolates it from the English around it.
 *
 * Post bodies come from the editor as plain HTML with no language markup, so
 * this runs over the rendered DOM the way image shaping does.
 */
export function tagArabicRuns(root: ParentNode | null) {
  if (!root) return;
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || !ARABIC.test(node.textContent)) return NodeFilter.FILTER_REJECT;
      const parent = (node as Text).parentElement;
      if (!parent || parent.closest('[lang="ar"]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const targets: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) targets.push(node as Text);

  for (const node of targets) {
    const text = node.textContent ?? "";
    const fragment = document.createDocumentFragment();
    let last = 0;
    RUN.lastIndex = 0;
    for (let match = RUN.exec(text); match; match = RUN.exec(text)) {
      if (match.index > last) {
        fragment.append(document.createTextNode(text.slice(last, match.index)));
      }
      const span = document.createElement("span");
      span.setAttribute("lang", "ar");
      span.setAttribute("dir", "rtl");
      span.textContent = match[0];
      fragment.append(span);
      last = match.index + match[0].length;
    }
    if (last < text.length) fragment.append(document.createTextNode(text.slice(last)));
    node.replaceWith(fragment);
  }
}
