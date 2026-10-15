import type { ReactNode } from "react";

interface SummaryCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  helper?: string;
}

function SummaryCard({ title, value, icon, helper }: SummaryCardProps) {
  return (
    <article className="summary-card" aria-label={`${title} summary`}>
      <div className="summary-card__header">
        <span className="summary-card__icon" aria-hidden="true">{icon}</span>
        <span className="summary-card__label">{title}</span>
      </div>

      <div className="summary-card__value">{new Intl.NumberFormat().format(value)}</div>

      {helper ? <p className="summary-card__helper">{helper}</p> : null}
    </article>
  );
}

export default SummaryCard;
