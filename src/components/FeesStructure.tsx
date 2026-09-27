import { formatMoney } from "../../shared/format";
import {
  BLESSING,
  BOYS_SECTION_NOTE,
  CHANGES_NOTE,
  DRESS_CODE,
  EVENING_FEES,
  MORNING_FEES,
  TERMS,
  type SectionFees,
} from "../../shared/letterhead";

function SectionCard({ section, symbol }: { section: SectionFees; symbol: string | null | undefined }) {
  return (
    <article className="structure-card">
      <h3>{section.title}</h3>
      <p>{section.yearNote}</p>
      <p>
        Fees per term {formatMoney(section.feePerTerm, symbol)}. Admission for new students{" "}
        {formatMoney(section.admission, symbol)}.
      </p>
      <div className="table-wrap">
        <table>
          <caption className="table-caption">{section.title} installments</caption>
          <thead>
            <tr>
              <th>No.</th>
              <th>Categories</th>
              <th>Per term</th>
            </tr>
          </thead>
          <tbody>
            {section.installments.map((row, index) => (
              <tr key={row.label}>
                <td data-label="No.">{index + 1}</td>
                <td data-label="Categories">{row.label}</td>
                <td data-label="Per term">{formatMoney(row.amount, symbol)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {section.clearance ? <p>{section.clearance}</p> : null}
      <p className="structure-label">Time schedule</p>
      <ul className="structure-list">
        {section.schedule.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="structure-label">Yearly madrasa holidays</p>
      <ul className="structure-list">
        {section.holidays.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {section.extraNote ? <p>{section.extraNote}</p> : null}
    </article>
  );
}

export function FeesStructure({
  symbol,
  compact = false,
}: {
  symbol: string | null | undefined;
  compact?: boolean;
}) {
  return (
    <div className="fees-structure">
      <p>One academic year consists of two terms. Each term is six months.</p>
      <ul className="structure-list">
        {TERMS.map((term) => (
          <li key={term.name}>
            {term.name}: {term.months}
          </li>
        ))}
      </ul>
      <p>{BOYS_SECTION_NOTE}</p>
      <div className="structure-grid">
        <SectionCard section={MORNING_FEES} symbol={symbol} />
        <SectionCard section={EVENING_FEES} symbol={symbol} />
      </div>
      {compact ? null : (
        <>
          <h3>Dress code for the students</h3>
          <div className="table-wrap">
            <table>
              <caption className="table-caption">Uniform</caption>
              <thead>
                <tr>
                  <th>Who</th>
                  <th>Dress</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {DRESS_CODE.map((row) => (
                  <tr key={row.who}>
                    <td data-label="Who">{row.who}</td>
                    <td data-label="Dress">{row.dress}</td>
                    <td data-label="Price">{row.price ? formatMoney(row.price, symbol) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p>{CHANGES_NOTE}</p>
      <p className="blessing">{BLESSING}</p>
    </div>
  );
}
