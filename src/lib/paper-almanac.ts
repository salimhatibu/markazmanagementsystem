export function paperIssueNumber(posts: { id: number; slug: string }[], slug?: string) {
  const ordered = [...posts].sort((a, b) => a.id - b.id);
  if (!ordered.length) return null;
  if (!slug) return ordered.length;
  const index = ordered.findIndex((post) => post.slug === slug);
  return index === -1 ? null : index + 1;
}

export function paperBrief(text: string, max = 180) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
