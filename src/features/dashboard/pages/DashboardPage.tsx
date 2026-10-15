import DashboardHeader from "../components/DashboardHeader";
import DashboardSummaryGrid from "../components/DashboardSummaryGrid";
import EntityDistributionChart from "../components/EntityDistributionChart";
import OperationsBarChart from "../components/OperationsBarChart";
import QuotationOrderChart from "../components/QuotationOrderChart";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import "../styles/dashboard.css";

function DashboardPage() {
  const { summary, isLoading, isRefreshing, error, lastUpdated, refetch } = useDashboardSummary();
  const showSkeleton = isLoading && !summary;

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <DashboardHeader
          title="Dashboard"
          subtitle="Overview of your business operations"
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
            <div className="dashboard-skeleton-grid" aria-label="Loading dashboard summary">
              {Array.from({ length: 11 }, (_, index) => (
                <div key={`summary-skeleton-${index}`} className="dashboard-skeleton-card" />
              ))}
            </div>

            <section className="chart-grid" aria-label="Loading dashboard charts">
              <div className="dashboard-skeleton-chart" />
              <div className="dashboard-skeleton-chart" />
              <div className="dashboard-skeleton-chart" />
            </section>
          </>
        ) : summary ? (
          <>
            <DashboardSummaryGrid summary={summary} />

            <section className="chart-grid" aria-label="Dashboard charts">
              <article className="chart-panel">
                <div className="chart-panel__header">
                  <h2 className="chart-panel__title">Entity distribution</h2>
                  <span className="chart-panel__meta">Counts</span>
                </div>
                <EntityDistributionChart summary={summary} />
              </article>

              <article className="chart-panel">
                <div className="chart-panel__header">
                  <h2 className="chart-panel__title">Business operations</h2>
                  <span className="chart-panel__meta">Operational totals</span>
                </div>
                <OperationsBarChart summary={summary} />
              </article>

              <article className="chart-panel chart-panel--wide">
                <div className="chart-panel__header">
                  <h2 className="chart-panel__title">Quotation and order overview</h2>
                  <span className="chart-panel__meta">Current totals</span>
                </div>
                <QuotationOrderChart summary={summary} />
              </article>
            </section>
          </>
        ) : null}

        {!summary && !isLoading && !error ? (
          <div className="chart-empty">No dashboard data is available yet.</div>
        ) : null}
      </div>
    </main>
  );
}

export default DashboardPage;