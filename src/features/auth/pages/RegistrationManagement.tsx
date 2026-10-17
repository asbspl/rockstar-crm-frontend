
import { useCallback, useEffect, useState } from "react";
import "./RegistrationManagement.css";


type RegistrationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";


const API = "http://localhost:3000/api";
type Registration = {
  id: number | string;
  full_name: string;
  email: string;
  phone?: string | null;
  status: string;
  account_status: string;
  created_at: string;
  roles?: Array<{ id: number; name: string }>;
  permissionIds?: number[];
  effectivePermissionIds?: number[];
  profile?: Record<string, unknown> | null;
  kyc?: Record<string, unknown> | null;
  bank?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type Role = {
  id: number;
  name: string;
};

type Permission = {
  id: number;
  name: string;
  description?: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(await getAuthHeaders()),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message || `Request failed (${response.status})`
    );
  }

  return result as T;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function DetailSection({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;

  return (
    <section className="registration-section">
      <h3>{title}</h3>

      {!data || Object.keys(data).length === 0 ? (
        <p className="muted">No information provided.</p>
      ) : (
        <div className="registration-detail-grid">
          {Object.entries(data).map(([key, item]) => (
            <div className="registration-detail" key={key}>
              <span>{key.replaceAll("_", " ")}</span>
              <strong>{formatValue(item)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function RegistrationManagement() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [permissionIds, setPermissionIds] = useState<number[]>([]);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<RegistrationStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [registrationResult, roleResult, permissionResult] =
        await Promise.all([
          apiRequest<{ success: boolean; data: Registration[] }>(
            `/admin/registrations?status=${status}`
          ),
          apiRequest<{ success: boolean; data: Role[] }>(
            "/admin/registrations/meta/roles"
          ),
          apiRequest<{ success: boolean; data: Permission[] }>(
            "/admin/registrations/meta/permissions"
          ),
        ]);

      setRegistrations(registrationResult.data);
      setRoles(roleResult.data);
      setPermissions(permissionResult.data);

      setSelected((current) => {
        if (
          current &&
          registrationResult.data.some(
            (item) => String(item.id) === String(current.id)
          )
        ) {
          return current;
        }

        return null;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load registrations."
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  async function openRegistration(item: Registration) {
    setError("");
    setMessage("");

    try {
      const result = await apiRequest<{
        success: boolean;
        data: Registration;
      }>(`/admin/registrations/${item.id}`);

      setSelected(result.data);
      setRoleIds((result.data.roles || []).map((role) => Number(role.id)));
      setPermissionIds([]);
      setReason("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load registration details."
      );
    }
  }

  function toggleId(
    id: number,
    checked: boolean,
    setter: React.Dispatch<React.SetStateAction<number[]>>
  ) {
    setter((current) =>
      checked
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((item) => item !== id)
    );
  }

  async function submitReview(decision: "approved" | "rejected") {
    if (!selected) return;

    if (decision === "approved" && roleIds.length === 0) {
      setError("Select at least one role before approving.");
      return;
    }

    if (decision === "rejected" && !reason.trim()) {
      setError("Enter a reason before rejecting the registration.");
      return;
    }

    const confirmed = window.confirm(
      decision === "approved"
        ? "Approve this registration and assign the selected access?"
        : "Reject this registration?"
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await apiRequest<{
        success: boolean;
        message: string;
      }>(`/admin/registrations/${selected.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          decision,
          reason: reason.trim(),
          roleIds,
          permissionIds,
        }),
      });

      setMessage(result.message);
      setSelected(null);
      await loadRegistrations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit the review."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="registration-management">
      <header className="registration-header">
        <div>
          <h1>Registration Requests</h1>
          <p>Review applicant details and control account access.</p>
        </div>


        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as RegistrationStatus | "all"
            )
          }
          aria-label="Registration status"
        >
          <option value="all">All registrations</option>
          <option value="pending">Pending requests</option>
          <option value="approved">Approved requests</option>
          <option value="rejected">Rejected requests</option>
        </select>

      </header>

      {error && <div className="registration-alert error">{error}</div>}
      {message && (
        <div className="registration-alert success">{message}</div>
      )}

      <div className="registration-layout">
        <aside className="registration-list">
          <h2>Applicants ({registrations.length})</h2>

          {loading ? (
            <p>Loading requests...</p>
          ) : registrations.length === 0 ? (
            <p className="muted">No {status} registrations found.</p>
          ) : (
            registrations.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`registration-list-item ${String(selected?.id) === String(item.id) ? "selected" : ""
                  }`}
                onClick={() => void openRegistration(item)}
              >
                <strong>{item.full_name}</strong>
                <span>{item.email}</span>
                <small>
                  Submitted:{" "}
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString()
                    : "Unknown"}
                </small>
                <small>Status: {item.account_status}</small>
              </button>
            ))
          )}
        </aside>

        <section className="registration-review">
          {!selected ? (
            <div className="registration-empty">
              <h2>Select a registration</h2>
              <p>
                Choose an applicant from the list to review their complete
                submission and configure their access.
              </p>
            </div>
          ) : (
            <>
              <div className="registration-applicant-header">
                <div>
                  <h2>{selected.full_name}</h2>
                  <p>{selected.email}</p>
                </div>
                <span className="registration-status">
                  {selected.account_status}
                </span>
              </div>

              <DetailSection
                title="Account information"
                value={{
                  id: selected.id,
                  full_name: selected.full_name,
                  email: selected.email,
                  status: selected.status,
                  account_status: selected.account_status,
                  created_at: selected.created_at,
                }}
              />

              <DetailSection title="Profile information" value={selected.profile} />
              <DetailSection title="KYC information" value={selected.kyc} />
              <DetailSection title="Bank account information" value={selected.bank} />

              <DetailSection
                title="Other registration fields"
                value={Object.fromEntries(
                  Object.entries(selected).filter(
                    ([key]) =>
                      ![
                        "id",
                        "full_name",
                        "email",
                        "status",
                        "account_status",
                        "created_at",
                        "profile",
                        "kyc",
                        "bank",
                        "roles",
                      ].includes(key)
                  )
                )}
              />

              <section className="registration-section">
                <h3>Assign role(s)</h3>
                <p className="muted">
                  Choose the responsibilities this user will have.
                </p>

                {roles.map((role) => (
                  <label className="registration-choice" key={role.id}>
                    <input
                      type="checkbox"
                      checked={roleIds.includes(Number(role.id))}
                      onChange={(event) =>
                        toggleId(
                          Number(role.id),
                          event.target.checked,
                          setRoleIds
                        )
                      }
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </section>

              <section className="registration-section">
                <h3>Assign permissions</h3>
                <p className="muted">
                  Select the additional permissions this user should receive.
                </p>

                {permissions.map((permission) => (
                  <label className="registration-choice" key={permission.id}>
                    <input
                      type="checkbox"
                      checked={permissionIds.includes(Number(permission.id))}
                      onChange={(event) =>
                        toggleId(
                          Number(permission.id),
                          event.target.checked,
                          setPermissionIds
                        )
                      }
                    />
                    <span>
                      <strong>{permission.name}</strong>
                      {permission.description && (
                        <small>{permission.description}</small>
                      )}
                    </span>
                  </label>
                ))}
              </section>

              <section className="registration-section">
                <h3>Admin review notes</h3>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    status === "pending"
                      ? "Optional approval notes or required rejection reason"
                      : "Review notes"
                  }
                  rows={3}
                />
              </section>

              {status === "pending" && (
                <div className="registration-actions">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void submitReview("rejected")}
                    className="registration-reject"
                  >
                    {saving ? "Saving..." : "Reject request"}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void submitReview("approved")}
                    className="registration-approve"
                  >
                    {saving ? "Saving..." : "Approve and assign access"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
