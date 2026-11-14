import DashboardHeader from "../components/DashboardHeader";
import DashboardSummaryGrid from "../components/DashboardSummaryGrid";
import EntityDistributionChart from "../components/EntityDistributionChart";
import OperationsBarChart from "../components/OperationsBarChart";
import QuotationOrderChart from "../components/QuotationOrderChart";

import { useDashboardSummary } from "../hooks/useDashboardSummary";
import "../styles/dashboard.css";

function DashboardPage() {
  const {
    summary,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refetch,
  } = useDashboardSummary();

  const showSkeleton = isLoading && !summary;

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <DashboardHeader
          title="Dashboard"
          subtitle="Your business performance, all in one place."
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          onRefresh={() => void refetch({ silent: true })}
        />

        {error ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Unable to load dashboard data.</strong>
              <span>{error}</span>
            </div>

            <button type="button" onClick={() => void refetch()}>
              Retry
            </button>
          </div>
        ) : null}

        {showSkeleton ? (
          <>
            <div
              className="dashboard-skeleton-grid"
              aria-label="Loading dashboard summary"
            >
              {Array.from({ length: 11 }, (_, index) => (
                <div
                  key={`summary-skeleton-${index}`}
                  className="dashboard-skeleton-card"
                />
              ))}
            </div>

            <section
              className="chart-grid"
              aria-label="Loading dashboard charts"
            >
              <div className="dashboard-skeleton-chart" />
              <div className="dashboard-skeleton-chart" />
              <div className="dashboard-skeleton-chart" />
            </section>
          </>
        ) : summary ? (
          <>
            <div className="dashboard-section-heading">
              <h2>BUSINESS OVERVIEW</h2>
            </div>

            <DashboardSummaryGrid summary={summary} />

            <div className="dashboard-section-heading dashboard-analytics-heading">
              <h2>ANALYTICS & INSIGHTS</h2>
            </div>

            <section className="chart-grid" aria-label="Dashboard charts">
              <article className="chart-panel">
                <div className="chart-panel__header">
                  <span className="chart-panel__letter">A</span>
                  <h2 className="chart-panel__title">Entity Distribution</h2>
                </div>

                <EntityDistributionChart summary={summary} />
              </article>

              <article className="chart-panel">
                <div className="chart-panel__header">
                  <span className="chart-panel__letter">B</span>
                  <h2 className="chart-panel__title">Business Operations</h2>
                </div>

                <OperationsBarChart summary={summary} />
              </article>

              <article className="chart-panel">
                <div className="chart-panel__header">
                  <span className="chart-panel__letter">C</span>
                  <h2 className="chart-panel__title">
                    Quotation & Order Overview
                  </h2>
                </div>

                <QuotationOrderChart summary={summary} />
              </article>
            </section>
          </>
        ) : null}

        {!summary && !isLoading && !error ? (
          <div className="chart-empty">
            No dashboard data is available yet.
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default DashboardPage;