import type { ReactNode } from "react";

interface SummaryCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  iconBg?: string;
  helper?: string;
}

function SummaryCard({
  title,
  value,
  icon,
}: SummaryCardProps) {
  const isZero = value === 0;

  return (
    <article
      className={`summary-card ${isZero ? "summary-card--zero" : ""}`}
      aria-label={`${title} summary`}
    >
      <span className="summary-card__icon" aria-hidden="true">
        {icon}
      </span>

      <div className="summary-card__content">
        <p className="summary-card__label">{title}</p>
        <div className="summary-card__value">
          {new Intl.NumberFormat().format(value)}
        </div>
      </div>
    </article>
  );
}

export default SummaryCard;