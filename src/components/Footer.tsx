const credits = [
  { label: "Design by", value: "Abu Ruhayn" },
  { label: "Owner", value: "Fahima Ali" },
  { label: "Institute", value: "Markaz Imam ash-Shafi'i" },
  { label: "Location", value: "Mombasa, Kenya" },
];

export function Footer() {
  return (
    <footer className="footer">
      <dl className="footer-grid">
        <div>
          <dt className="kicker">Sponsored by</dt>
          <dd>
            <a href="https://maktabahruhayn.com" target="_blank" rel="noreferrer noopener">
              maktabahruhayn.com
            </a>
          </dd>
        </div>
        {credits.map((credit) => (
          <div key={credit.label}>
            <dt className="kicker">{credit.label}</dt>
            <dd>{credit.value}</dd>
          </div>
        ))}
      </dl>
    </footer>
  );
}
