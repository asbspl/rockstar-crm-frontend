import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getRegistrationStatus } from "../api/auth.api";
import type { RegistrationStatusRecord } from "../types/auth.types";
import "../styles/auth.css";


const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  // under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
  changes_requested: "Changes Requested",
};

const NEXT_STEPS: Record<string, string> = {
  pending: "Your application is waiting for admin review.",
  under_review: "The team is reviewing your profile and supporting documents.",
  approved: "Your account has been approved and you can now sign in.",
  rejected: "Please review the rejection reason and resubmit corrected information if eligible.",
  suspended: "Your account has been suspended; contact support for assistance.",
  changes_requested: "Please update the requested fields and resubmit your application.",
};

function RegistrationStatusPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<RegistrationStatusRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function fetchStatus() {
      try {
        const payload = await getRegistrationStatus();
        if (isActive) {
          setStatus(payload);
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "Unable to load your registration status.";
        if (isActive) {
          setError(message);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void fetchStatus();

    return () => {
      isActive = false;
    };
  }, []);

  const normalizedStatus = useMemo(() => {
    const rawStatus = status?.status ?? "pending";
    return String(rawStatus).trim().toLowerCase();
  }, [status]);

  const title = STATUS_LABELS[normalizedStatus] ?? "Registration Status";
  const nextStep = status?.nextStep ?? NEXT_STEPS[normalizedStatus] ?? "Please wait for the next review update.";
  const applicationReference =
    status?.applicationReference ?? status?.application_reference ?? status?.reference ?? "N/A";
  const submissionDate =
    status?.submissionDate ?? status?.submittedAt ?? status?.submitted_at ?? "Not available";
  const reviewerFeedback =
    status?.reviewerFeedback ?? status?.reviewer_feedback ?? status?.feedback ?? "No additional feedback is available.";

  if (isLoading) {
    return (
      <main className="auth-page">
        <section className="auth-panel auth-panel--narrow">
          <div className="auth-loading">Loading registration status...</div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel--narrow">
        <div className="auth-branding">
          <div className="auth-logo">R</div>
          <div>
            <p className="auth-kicker">Rockstar CRM</p>
            <h1>{title}</h1>
          </div>
        </div>

        {error ? <div className="auth-error" role="alert">{error}</div> : null}

        {status ? (
          <div className="status-stack">
            <div className="status-card">
              <span className="status-label">Application reference</span>
              <strong>{applicationReference}</strong>
            </div>
            <div className="status-card">
              <span className="status-label">Status</span>
              <strong>{title}</strong>
            </div>
            <div className="status-card">
              <span className="status-label">Submitted</span>
              <strong>{submissionDate}</strong>
            </div>
            <div className="status-card">
              <span className="status-label">Next step</span>
              <strong>{nextStep}</strong>
            </div>
            <div className="status-card">
              <span className="status-label">Reviewer feedback</span>
              <strong>{reviewerFeedback}</strong>
            </div>
          </div>
        ) : null}

        <div className="auth-actions auth-actions--stacked">
          {status?.canResubmit || status?.resubmitAllowed || normalizedStatus === "changes_requested" ? (
            <button type="button" className="auth-submit" onClick={() => navigate("/register", { replace: true })}>
              Submit corrected information
            </button>
          ) : null}

          <Link to="/login" className="auth-submit auth-submit--secondary">
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}

export default RegistrationStatusPage;
