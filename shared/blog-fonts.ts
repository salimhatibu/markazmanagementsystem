export type BlogFont = {
  id: string;
  label: string;
  stack: string;
  /** Google Fonts `family=` query value, when the font needs loading. */
  google?: string;
};

/** "Default" keeps the site's own type; everything else is a loadable Google Font. */
export const BLOG_FONTS: BlogFont[] = [
  { id: "default", label: "Default", stack: "" },
  { id: "inter", label: "Inter", stack: "'Inter', sans-serif", google: "Inter:wght@400;600;700" },
  { id: "roboto", label: "Roboto", stack: "'Roboto', sans-serif", google: "Roboto:wght@400;600;700" },
  { id: "open-sans", label: "Open Sans", stack: "'Open Sans', sans-serif", google: "Open+Sans:wght@400;600;700" },
  { id: "lato", label: "Lato", stack: "'Lato', sans-serif", google: "Lato:wght@400;700" },
  { id: "montserrat", label: "Montserrat", stack: "'Montserrat', sans-serif", google: "Montserrat:wght@400;600;700" },
  { id: "poppins", label: "Poppins", stack: "'Poppins', sans-serif", google: "Poppins:wght@400;600;700" },
  { id: "nunito", label: "Nunito", stack: "'Nunito', sans-serif", google: "Nunito:wght@400;600;700" },
  { id: "raleway", label: "Raleway", stack: "'Raleway', sans-serif", google: "Raleway:wght@400;600;700" },
  { id: "work-sans", label: "Work Sans", stack: "'Work Sans', sans-serif", google: "Work+Sans:wght@400;600;700" },
  { id: "rubik", label: "Rubik", stack: "'Rubik', sans-serif", google: "Rubik:wght@400;600;700" },
  { id: "mulish", label: "Mulish", stack: "'Mulish', sans-serif", google: "Mulish:wght@400;600;700" },
  { id: "noto-sans", label: "Noto Sans", stack: "'Noto Sans', sans-serif", google: "Noto+Sans:wght@400;600;700" },
  { id: "ibm-plex-sans", label: "IBM Plex Sans", stack: "'IBM Plex Sans', sans-serif", google: "IBM+Plex+Sans:wght@400;600;700" },
  { id: "space-grotesk", label: "Space Grotesk", stack: "'Space Grotesk', sans-serif", google: "Space+Grotesk:wght@400;600;700" },
  { id: "oswald", label: "Oswald", stack: "'Oswald', sans-serif", google: "Oswald:wght@400;600;700" },
  { id: "merriweather", label: "Merriweather", stack: "'Merriweather', serif", google: "Merriweather:wght@400;700" },
  { id: "playfair", label: "Playfair Display", stack: "'Playfair Display', serif", google: "Playfair+Display:wght@400;600;700" },
  { id: "lora", label: "Lora", stack: "'Lora', serif", google: "Lora:wght@400;600;700" },
  { id: "pt-serif", label: "PT Serif", stack: "'PT Serif', serif", google: "PT+Serif:wght@400;700" },
  { id: "source-serif", label: "Source Serif 4", stack: "'Source Serif 4', serif", google: "Source+Serif+4:wght@400;600;700" },
  { id: "crimson", label: "Crimson Text", stack: "'Crimson Text', serif", google: "Crimson+Text:wght@400;600;700" },
  { id: "libre-baskerville", label: "Libre Baskerville", stack: "'Libre Baskerville', serif", google: "Libre+Baskerville:wght@400;700" },
  { id: "eb-garamond", label: "EB Garamond", stack: "'EB Garamond', serif", google: "EB+Garamond:wght@400;600;700" },
  { id: "cormorant", label: "Cormorant Garamond", stack: "'Cormorant Garamond', serif", google: "Cormorant+Garamond:wght@400;600;700" },
  { id: "fraunces", label: "Fraunces", stack: "'Fraunces', serif", google: "Fraunces:wght@400;600;700" },
  { id: "zilla-slab", label: "Zilla Slab", stack: "'Zilla Slab', serif", google: "Zilla+Slab:wght@400;600;700" },
  { id: "ibm-plex-serif", label: "IBM Plex Serif", stack: "'IBM Plex Serif', serif", google: "IBM+Plex+Serif:wght@400;600;700" },
  { id: "jetbrains-mono", label: "JetBrains Mono", stack: "'JetBrains Mono', monospace", google: "JetBrains+Mono:wght@400;600;700" },
  { id: "amiri", label: "Amiri", stack: "'Amiri', serif", google: "Amiri:wght@400;700" },
];

export const BLOG_FONT_IDS = BLOG_FONTS.map((font) => font.id);

export function fontById(id: string | null | undefined): BlogFont {
  return BLOG_FONTS.find((font) => font.id === id) ?? BLOG_FONTS[0];
}
