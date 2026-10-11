const credits = [
  { label: "Design", value: "Abu Ruhayn" },
  { label: "Owner", value: "Meemy" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-body">
        <div className="footer-mark">
          <p className="footer-name">Markaz Imam ash-Shafi&rsquo;i</p>
          <p className="footer-place">Mombasa, Kenya &middot; East Africa Time</p>
        </div>

        <dl className="footer-credits">
          <div className="footer-credit">
            <dt>Sponsored by</dt>
            <dd>
              <a href="https://maktabahruhayn.com" target="_blank" rel="noreferrer noopener">
                maktabahruhayn.com
              </a>
            </dd>
          </div>
          {credits.map((credit) => (
            <div className="footer-credit" key={credit.label}>
              <dt>{credit.label}</dt>
              <dd>{credit.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="footer-fine">
        <span>&copy; {year} Markaz Imam ash-Shafi&rsquo;i</span>
        <span>All records kept on this desk</span>
      </p>
    </footer>
  );
}
