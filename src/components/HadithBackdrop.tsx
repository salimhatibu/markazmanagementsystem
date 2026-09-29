const ICONS = [
  "/hadith/wave.png",
  "/hadith/pyramids.png",
  "/hadith/mosque.png",
  "/hadith/books.png",
  "/hadith/letter.png",
];

export function HadithBackdrop() {
  return (
    <div className="hadith-backdrop" aria-hidden="true">
      <div className="hadith-wash" />
      {ICONS.map((src, index) => (
        <span key={src} className={`hadith-motif hadith-motif-${index + 1}`}>
          <img src={src} alt="" />
        </span>
      ))}
    </div>
  );
}
