export function publicShelfPath() {
  return "/read";
}

export function publicPostPath(slug: string) {
  return `/read/${slug}`;
}

export function publicShelfUrl() {
  return `${window.location.origin}${publicShelfPath()}`;
}

export function publicPostUrl(slug: string) {
  return `${window.location.origin}${publicPostPath(slug)}`;
}

export async function shareUrl(title: string, url: string): Promise<"shared" | "copied"> {
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title, url, text: title });
      return "shared";
    }
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") throw caught;
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}
