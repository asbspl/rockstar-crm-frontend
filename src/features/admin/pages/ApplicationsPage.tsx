
import { useCallback, useEffect, useState } from "react";

import {
  getApplications,
  type AdminApplication,
} from "../api/admin.api";
import { Link } from "react-router-dom";

import "../styles/admin.css";

function ApplicationsPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
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
            <table className="data-table data-table--applications">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Applicant</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Review</th>
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
                    const status = String(
                      application.status ?? "pending",
                    ).toLowerCase();

                    const isPending =
                      status === "pending" ||
                      status === "under_review";

                    return (
                      <tr key={String(application.id)}>
                        <td data-label="Application">
                          {application.applicationReference ??
                            application.id}
                        </td>

                        <td data-label="Applicant">
                          {application.applicantName ?? "Unknown"}
                        </td>

                        <td data-label="Email">{application.email || "—"}</td>

                        <td data-label="Status">
                          <span
                            className={`status-badge status-badge--${
                              status === "under_review"
                                ? "pending"
                                : status === "rejected"
                                  ? "inactive"
                                  : status === "approved"
                                    ? "approved"
                                    : "pending"
                            }`}
                          >
                            {application.status ?? "pending"}
                          </span>
                        </td>

                        <td data-label="Submitted">
                          {application.submittedAt
                            ? new Date(
                                application.submittedAt,
                              ).toLocaleDateString()
                            : "—"}
                        </td>

                        <td data-label="Review">
                          {isPending ? (
                            <Link
                              className="mini-button"
                              to="/admin/registrations"
                            >
                              Review &amp; assign access
                            </Link>
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
