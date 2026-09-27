import type { FeeReceiptPreview } from "../types";

export function OfficialLetterhead({
  letterhead,
  title,
  preparedOn,
}: {
  letterhead: FeeReceiptPreview["letterhead"];
  title?: string;
  preparedOn?: string;
}) {
  return (
    <header className="letterhead">
      <p className="letterhead-name">{letterhead.markazName}</p>
      <p className="letterhead-address">{letterhead.address}</p>
      {title ? <h2 className="letterhead-title">{title}</h2> : null}
      {preparedOn ? <p className="letterhead-date">{preparedOn}</p> : null}
    </header>
  );
}

export function BankDetails({ letterhead }: { letterhead: FeeReceiptPreview["letterhead"] }) {
  return (
    <div className="bank-block">
      <p className="bank-heading">Trustees and paybill</p>
      <p>Fees and admission are paid to the bank through the following account:</p>
      <p className="bank-name">{letterhead.accountName}</p>
      <p>{letterhead.bankName}</p>
      <p>Paybill {letterhead.paybill}</p>
      <p>Account {letterhead.accountNumber}</p>
    </div>
  );
}
