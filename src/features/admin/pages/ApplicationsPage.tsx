
import { useCallback, useEffect, useState } from "react";

import {
  getApplications,
  reviewApplication,
  type AdminApplication,
  type ApplicationReviewAction,
} from "../api/admin.api";

import "../styles/admin.css";

function ApplicationsPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await getApplications();
      setApplications(payload);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load applications. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const handleReview = async (
    applicationId: string | number,
    action: ApplicationReviewAction,
  ) => {
    if (reviewingId !== null) return;

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this application?`,
    );

    if (!confirmed) return;

    setReviewingId(applicationId);
    setError(null);
    setActionMessage(null);

    try {
     const numericId = Number(applicationId);

if (!Number.isSafeInteger(numericId) || numericId <= 0) {
  throw new Error("Invalid application ID.");
}

const result = await reviewApplication(Number(applicationId), {
  decision: action === "approve" ? "approved" : "rejected",
  roleIds: [],
  permissionIds: [],
});

      if (!result.ok) {
        throw new Error(
          result.message ?? "Unable to review this application.",
        );
      }

      setActionMessage(
        result.message ??
          `Application ${action === "approve" ? "approved" : "rejected"} successfully.`,
      );

      await loadApplications();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to review this application. Please try again.",
      );
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <main className="admin-page">
      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <p className="auth-kicker">Admin</p>
            <h1>Applications</h1>
            <p>
              Review pending registration applications and approve or
              reject them.
            </p>
          </div>

          <button
            type="button"
            className="mini-button"
            onClick={() => void loadApplications()}
            disabled={isLoading || reviewingId !== null}
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="auth-success" role="status">
            {actionMessage}
          </div>
        )}

        {isLoading ? (
          <div
            className="auth-loading auth-loading--inline"
            role="status"
          >
            Loading applications...
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Applicant</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      No pending applications are available.
                    </td>
                  </tr>
                ) : (
                  applications.map((application) => {
                    const isReviewing =
                      reviewingId === application.id;

                    const status = String(
                      application.status ?? "pending",
                    ).toLowerCase();

                    const isPending =
                      status === "pending" ||
                      status === "under_review";

                    return (
                      <tr key={String(application.id)}>
                        <td>
                          {application.applicationReference ??
                            application.id}
                        </td>

                        <td>
                          {application.applicantName ?? "Unknown"}
                        </td>

                        <td>{application.email || "—"}</td>

                        <td>{application.status ?? "pending"}</td>

                        <td>
                          {application.submittedAt
                            ? new Date(
                                application.submittedAt,
                              ).toLocaleDateString()
                            : "—"}
                        </td>

                        <td>
                          {isPending ? (
                            <div className="table-actions">
                              <button
                                type="button"
                                className="mini-button"
                                disabled={reviewingId !== null}
                                onClick={() =>
                                  void handleReview(
                                    application.id,
                                    "approve",
                                  )
                                }
                              >
                                {isReviewing
                                  ? "Processing..."
                                  : "Approve"}
                              </button>

                              <button
                                type="button"
                                className="mini-button mini-button--danger"
                                disabled={reviewingId !== null}
                                onClick={() =>
                                  void handleReview(
                                    application.id,
                                    "reject",
                                  )
                                }
                              >
                                {isReviewing
                                  ? "Processing..."
                                  : "Reject"}
                              </button>
                            </div>
                          ) : (
                            <span>Reviewed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default ApplicationsPage;
