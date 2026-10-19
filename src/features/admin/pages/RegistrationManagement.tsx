
import { useCallback, useEffect, useState } from "react";
import {
  adminRegistrationApi,
  type AccessOption,
  type Registration,
  type RegistrationDetails,
  type RegistrationStatus,
} from "../api/admin.api";
import "../styles/RegistrationManagement.css";

type PermissionAction = {
  module: string;
  actions: string[];
};

const statuses: {
  label: string;
  value: RegistrationStatus | "all";
}[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const permissionMatrix: PermissionAction[] = [
  { module: "Manage Company", actions: ["Add", "Edit", "Delete"] },
  { module: "Manage Employee", actions: ["Add", "Edit", "Delete"] },
  { module: "Manage Driver", actions: ["Add", "Edit", "Delete"] },
  { module: "Manage Client", actions: ["Add", "Edit", "Delete"] },
  { module: "Manage Customer", actions: ["Add", "Edit", "Delete"] },
  {
    module: "Quotation Form",
    actions: ["Add", "Edit", "Delete", "Email", "Print"],
  },
  {
    module: "Order Form",
    actions: [
      "Add",
      "Edit",
      "Delete",
      "Email PI",
      "Print PI",
      "Email DC",
      "Print DC",
      "Dispatch",
    ],
  },
  { module: "Visit Form", actions: ["Add", "Edit", "Delete"] },
  { module: "Queries Form", actions: ["Add", "Edit", "Delete"] },
  { module: "Product", actions: ["Add", "Edit", "Delete"] },
  { module: "Rate Matrix", actions: ["Add", "Edit", "Delete"] },
  { module: "Location", actions: ["Add", "Edit", "Delete"] },
  { module: "Site", actions: ["Add", "Edit", "Delete"] },
  { module: "Manage Contractor", actions: ["Add", "Edit", "Delete"] },
  {
    module: "Coupon Scheme",
    actions: [
      "Add",
      "Edit",
      "Delete",
      "Coupon Code Generate",
      "Coupon Code Print",
    ],
  },
  { module: "Coupon", actions: ["Coupon Scan", "Coupon Redeem"] },
  { module: "Redeem Request List", actions: [] },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return (
      <section className="registration-detail-section">
        <h3>{title}</h3>
        <p>{formatValue(value)}</p>
      </section>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);

  return (
    <section className="registration-detail-section">
      <h3>{title}</h3>

      {entries.length === 0 ? (
        <p>No information provided.</p>
      ) : (
        <dl className="registration-detail-grid">
          {entries.map(([key, item]) => (
            <div key={key}>
              <dt>{key.replace(/_/g, " ")}</dt>
              <dd>{formatValue(item)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export default function RegistrationManagement() {
  const [status, setStatus] = useState<RegistrationStatus | "all">("all");

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selected, setSelected] = useState<RegistrationDetails | null>(null);

  const [roles, setRoles] = useState<AccessOption[]>([]);
  const [permissions, setPermissions] = useState<AccessOption[]>([]);

  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [permissionIds, setPermissionIds] = useState<number[]>([]);

  const [savedRoleIds, setSavedRoleIds] = useState<number[]>([]);
  const [savedPermissionIds, setSavedPermissionIds] = useState<number[]>([]);

  const [effectivePermissionIds, setEffectivePermissionIds] = useState<
    number[]
  >([]);

  const [decisionReason, setDecisionReason] = useState("");
  const [editingAccess, setEditingAccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await adminRegistrationApi.list(
        status === "all" ? undefined : status,
      );

      setRegistrations(result.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load registrations.",
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccessOptions() {
      try {
        const [roleResult, permissionResult] = await Promise.all([
          adminRegistrationApi.roles(),
          adminRegistrationApi.permissions(),
        ]);

        if (!cancelled) {
          setRoles(roleResult.data || []);
          setPermissions(permissionResult.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load roles and permissions.",
          );
        }
      }
    }

    void loadAccessOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  async function openRegistration(registration: Registration) {
    setError("");
    setMessage("");
    setEditingAccess(false);

    try {
      const result = await adminRegistrationApi.get(registration.id);
      const details = result.data;

      const assignedRoleIds = (details.roles ?? [])
        .map((role) => Number(role.id))
        .filter(Number.isFinite);

      const assignedPermissionIds = (details.permissionIds ?? [])
        .map(Number)
        .filter(Number.isFinite);

      const effectiveIds = (details.effectivePermissions ?? [])
        .map((permission) => Number(permission.id))
        .filter(Number.isFinite);

      setSelected(details);
      setRoleIds(assignedRoleIds);
      setPermissionIds(assignedPermissionIds);
      setSavedRoleIds([...assignedRoleIds]);
      setSavedPermissionIds([...assignedPermissionIds]);
      setEffectivePermissionIds(effectiveIds);
      setDecisionReason("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load registration details.",
      );
    }
  }

  function closeRegistration() {
    setSelected(null);
    setEditingAccess(false);
    setError("");
    setMessage("");
  }

  function toggleId(
    id: number,
    current: number[],
    update: (ids: number[]) => void,
  ) {
    update(
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function cancelAccessChanges() {
    setRoleIds([...savedRoleIds]);
    setPermissionIds([...savedPermissionIds]);
    setEditingAccess(false);
    setError("");
    setMessage("");
  }

  async function submitReview(decision: "approved" | "rejected") {
    if (!selected || reviewing) return;

    const currentStatus = String(
      selected.account_status ?? selected.status ?? "",
    ).toLowerCase();

    if (currentStatus !== "pending") {
      setError("Only pending registrations can be approved or rejected.");
      return;
    }

    if (decision === "approved" && roleIds.length === 0) {
      setError("Select at least one role before approving.");
      return;
    }

    if (decision === "rejected" && !decisionReason.trim()) {
      setError("Enter a reason for rejecting this registration.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${decision} this registration?`,
    );

    if (!confirmed) return;

    setReviewing(true);
    setError("");
    setMessage("");

    try {
      const result = await adminRegistrationApi.review(selected.id, {
        decision,
        reason: decisionReason.trim(),
        roleIds: decision === "approved" ? roleIds : [],
        permissionIds: decision === "approved" ? permissionIds : [],
      });

      setMessage(result.message || `Registration ${decision}.`);
      setSelected(null);
      setEditingAccess(false);

      await loadRegistrations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit the review.",
      );
    } finally {
      setReviewing(false);
    }
  }

  async function saveAccessChanges() {
    if (!selected || savingAccess) return;

    if (roleIds.length === 0) {
      setError("Select at least one role.");
      return;
    }

    const confirmed = window.confirm(
      "Save the updated roles and permissions for this user?",
    );

    if (!confirmed) return;

    setSavingAccess(true);
    setError("");
    setMessage("");

    try {
      // TODO: Connect this to the backend access-update API.
      // Do not show success until the API confirms the database update.
      setError(
        "Access update API is not connected yet. Your changes have not been saved.",
      );
    } finally {
      setSavingAccess(false);
    }
  }

  function updateModulePermissions(ids: number[], checked: boolean) {
    setPermissionIds((current) => {
      const updated = new Set(current);

      for (const id of ids) {
        if (checked) {
          updated.add(id);
        } else {
          updated.delete(id);
        }
      }

      return Array.from(updated);
    });
  }

  const registrationStatus = String(
    selected?.account_status ?? selected?.status ?? "",
  ).toLowerCase();

  const isPending = registrationStatus === "pending";

  return (
    <main className="registration-management">
      <div className="registration-page-heading">
        <div>
          <h1>Registration Management</h1>
          <p>Review registration requests and manage user access.</p>
        </div>

        {selected && (
          <button
            type="button"
            className="registration-secondary-button"
            onClick={closeRegistration}
          >
            Back to Requests
          </button>
        )}
      </div>

      {error && (
        <div className="registration-alert error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="registration-alert success" role="status">
          {message}
        </div>
      )}

      {!selected ? (
        <>
          <div className="registration-tabs">
            {statuses.map((item) => (
              <button
                key={item.value}
                type="button"
                className={status === item.value ? "active" : ""}
                onClick={() => setStatus(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="registration-table-wrapper">
            <table className="registration-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Registration Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>Loading registrations...</td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No registrations found.</td>
                  </tr>
                ) : (
                  registrations.map((registration) => {
                    const rowStatus = String(
                      registration.account_status ?? registration.status ?? "",
                    ).toLowerCase();

                    return (
                      <tr
                        key={registration.id}
                        className="registration-clickable-row"
                        onClick={() => void openRegistration(registration)}
                      >
                        <td>{registration.full_name}</td>
                        <td>{registration.email}</td>
                        <td>
                          {registration.phone ||
                            registration.phone_number ||
                            "—"}
                        </td>
                        <td>
                          {registration.created_at
                            ? new Date(
                                registration.created_at,
                              ).toLocaleDateString()
                            : "—"}
                        </td>
                        <td>
                          <span
                            className={`registration-status ${rowStatus}`}
                          >
                            {rowStatus.replace(/_/g, " ") || "unknown"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="registration-review-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void openRegistration(registration);
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="registration-review-layout">
          <section className="registration-information">
            <h2>Applicant Details</h2>

            <DetailSection
              title="Basic Information"
              value={{
                full_name: selected.full_name,
                email: selected.email,
                phone: selected.phone || selected.phone_number,
                account_status: selected.account_status,
                created_at: selected.created_at,
              }}
            />

            <DetailSection title="Profile Information" value={selected.profile} />

            <DetailSection
              title="KYC Information"
              value={
                selected.kyc &&
                typeof selected.kyc === "object" &&
                !Array.isArray(selected.kyc)
                  ? Object.fromEntries(
                      Object.entries(
                        selected.kyc as Record<string, unknown>,
                      ).filter(
                        ([key]) =>
                          ![
                            "id",
                            "user_id",
                            "created_at",
                            "updated_at",
                            "reviewed_at",
                            "reviewed_by",
                            "pan_number_encrypted",
                            "aadhaar_number_encrypted",
                          ].includes(key.toLowerCase()),
                      ),
                    )
                  : selected.kyc
              }
            />

            <DetailSection
              title="Bank Information"
              value={
                selected.bank &&
                typeof selected.bank === "object" &&
                !Array.isArray(selected.bank)
                  ? Object.fromEntries(
                      Object.entries(
                        selected.bank as Record<string, unknown>,
                      ).filter(
                        ([key]) =>
                          ![
                            "id",
                            "user_id",
                            "created_at",
                            "updated_at",
                            "is_primary",
                            "account_number_encrypted",
                          ].includes(key.toLowerCase()),
                      ),
                    )
                  : selected.bank
              }
            />

            <DetailSection
              title="Other Submitted Information"
              value={Object.fromEntries(
                Object.entries(selected).filter(
                  ([key]) =>
                    ![
                      "id",
                      "full_name",
                      "email",
                      "phone",
                      "phone_number",
                      "account_status",
                      "created_at",
                      "roles",
                      "permissionIds",
                      "effectivePermissions",
                      "profile",
                      "kyc",
                      "bank",
                    ].includes(key),
                ),
              )}
            />
          </section>

          <aside className="registration-access-panel">
            <div className="permission-header">
              <h2>Assign Roles &amp; Permissions</h2>
              <p>
                Review existing access or update the assigned roles and
                permissions.
              </p>
            </div>

            <div className="registration-access-toolbar">
              {!editingAccess ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAccess(true);
                    setError("");
                    setMessage("");
                  }}
                >
                  Update Roles &amp; Permissions
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={cancelAccessChanges}
                    disabled={savingAccess}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void saveAccessChanges()}
                    disabled={savingAccess}
                  >
                    {savingAccess ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>

            <div className="role-card">
              <h3>Assigned Roles</h3>

              <div className="role-chip-list">
                {roles.map((role) => (
                  <label key={role.id} className="role-chip">
                    <input
                      type="checkbox"
                      checked={roleIds.includes(Number(role.id))}
                      disabled={!editingAccess}
                      onChange={() =>
                        toggleId(Number(role.id), roleIds, setRoleIds)
                      }
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>

              {!roles.length && (
                <p className="permission-empty">No roles available.</p>
              )}
            </div>

            <div className="permission-card">
              <h3>Module Access Allowed</h3>

              <div className="permission-table-wrapper">
                <table className="permission-table">
                  <thead>
                    <tr>
                      <th>All</th>
                      <th>Module</th>
                      <th>Permissions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {permissionMatrix.map(({ module, actions }) => {
                      const normalizedModule = normalize(module);

                      const modulePermissions = permissions.filter(
                        (permission) => {
                          const name = normalize(permission.name);
                          return (
                            name.includes(normalizedModule) ||
                            normalizedModule.includes(name)
                          );
                        },
                      );

                      const moduleIds = modulePermissions
                        .map((permission) => Number(permission.id))
                        .filter(Number.isFinite);

                      const allChecked =
                        moduleIds.length > 0 &&
                        moduleIds.every((id) => permissionIds.includes(id));

                      return (
                        <tr key={module}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select all permissions for ${module}`}
                              checked={allChecked}
                              disabled={!editingAccess || moduleIds.length === 0}
                              onChange={(event) =>
                                updateModulePermissions(
                                  moduleIds,
                                  event.target.checked,
                                )
                              }
                            />
                          </td>

                          <td className="module-title">{module}</td>

                          <td>
                            <div className="permission-tags">
                              {actions.length === 0 ? (
                                <span className="permission-empty">
                                  View Only
                                </span>
                              ) : (
                                actions.map((action) => {
                                  const normalizedAction = normalize(action);

                                  const permission = modulePermissions.find(
                                    (item) =>
                                      normalize(item.name).endsWith(
                                        normalizedAction,
                                      ) ||
                                      normalize(item.name).includes(
                                        normalizedModule + normalizedAction,
                                      ),
                                  );

                                  if (!permission) {
                                    return (
                                      <span
                                        key={`${module}-${action}`}
                                        className="permission-disabled"
                                        title={`No matching permission found for ${module} - ${action}`}
                                      >
                                        {action}
                                      </span>
                                    );
                                  }

                                  const id = Number(permission.id);

                                  return (
                                    <label
                                      key={permission.id}
                                      className="permission-pill"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={permissionIds.includes(id)}
                                        disabled={!editingAccess}
                                        onChange={() =>
                                          toggleId(
                                            id,
                                            permissionIds,
                                            setPermissionIds,
                                          )
                                        }
                                      />
                                      <span>{action}</span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {!editingAccess && (
              <p className="registration-access-note">
                Currently assigned access is shown above. Select Update Roles
                &amp; Permissions to make changes.
              </p>
            )}

            {isPending && (
              <>
                <hr />

                <label
                  className="registration-reason-label"
                  htmlFor="registration-review-reason"
                >
                  Review / Rejection Reason
                </label>

                <textarea
                  id="registration-review-reason"
                  value={decisionReason}
                  onChange={(event) => setDecisionReason(event.target.value)}
                  placeholder="Enter review notes or rejection reason..."
                  rows={3}
                  disabled={editingAccess || reviewing}
                />

                <div className="registration-review-actions">
                  <button
                    type="button"
                    className="registration-approve-button"
                    disabled={reviewing || editingAccess}
                    onClick={() => void submitReview("approved")}
                  >
                    {reviewing ? "Saving..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    className="registration-reject-button"
                    disabled={reviewing || editingAccess}
                    onClick={() => void submitReview("rejected")}
                  >
                    {reviewing ? "Saving..." : "Reject"}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
