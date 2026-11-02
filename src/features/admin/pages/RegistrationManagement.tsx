
import { useCallback, useEffect, useState } from "react";
import {
  adminRegistrationApi,
  getRoleDefaultPermissions,
  saveUserAccess,
  type AccessOption,
  type Registration,
  type RegistrationDetails,
  type RegistrationStatus,
} from "../api/admin.api";
import PermissionMatrix from "../components/PermissionMatrix";
import "../styles/RegistrationManagement.css";

const statuses: {
  label: string;
  value: RegistrationStatus | "all";
}[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

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
  const [roleDefaultPermissions, setRoleDefaultPermissions] = useState<
    Record<number, number[]>
  >({});

  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [permissionIds, setPermissionIds] = useState<number[]>([]);

  const [savedRoleIds, setSavedRoleIds] = useState<number[]>([]);
  const [savedPermissionIds, setSavedPermissionIds] = useState<number[]>([]);
  const [userGrantIds, setUserGrantIds] = useState<number[]>([]);
  const [userDenyIds, setUserDenyIds] = useState<number[]>([]);
  const [savedUserGrantIds, setSavedUserGrantIds] = useState<number[]>([]);
  const [savedUserDenyIds, setSavedUserDenyIds] = useState<number[]>([]);

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
        const roleDefaults = await Promise.all(
          (roleResult.data || []).map(async (role) => {
            const rolePermissions = await getRoleDefaultPermissions(role.id);
            return [
              Number(role.id),
              rolePermissions.map((permission) => Number(permission.id)),
            ] as const;
          }),
        );

        if (!cancelled) {
          setRoles(roleResult.data || []);
          setPermissions(permissionResult.data || []);
          setRoleDefaultPermissions(Object.fromEntries(roleDefaults));
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

      const effectiveIds = (details.effectivePermissions ?? [])
        .map((permission) => Number(permission.id))
        .filter(Number.isFinite);
      const assignedPermissionIds = effectiveIds.length
        ? effectiveIds
        : (details.permissionIds ?? []).map(Number).filter(Number.isFinite);

      setSelected(details);
      setRoleIds(assignedRoleIds);
      setPermissionIds(assignedPermissionIds);
      setSavedRoleIds([...assignedRoleIds]);
      setSavedPermissionIds([...assignedPermissionIds]);
      const grantIds = (details.permissionOverrides ?? [])
        .filter((override) => override.effect === "grant")
        .map((override) => Number(override.id))
        .filter(Number.isFinite);
      const denyIds = (details.permissionOverrides ?? [])
        .filter((override) => override.effect === "deny")
        .map((override) => Number(override.id))
        .filter(Number.isFinite);
      setUserGrantIds(grantIds);
      setUserDenyIds(denyIds);
      setSavedUserGrantIds(grantIds);
      setSavedUserDenyIds(denyIds);
      setEffectivePermissionIds(effectiveIds);
      setDecisionReason("");
      setEditingAccess(
        String(details.account_status ?? details.status ?? "").toLowerCase() ===
        "pending",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load registration details.",
      );
    }
  }

  async function closeRegistration() {
    const hasUnsavedChanges =
      roleIds.length !== savedRoleIds.length ||
      roleIds.some((id) => !savedRoleIds.includes(id)) ||
      permissionIds.length !== savedPermissionIds.length ||
      permissionIds.some((id) => !savedPermissionIds.includes(id));

    if (
      hasUnsavedChanges &&
      !(await window.crmPopup.confirm(
        "Discard the unsaved role and permission selections?",
        { title: "Discard changes", confirmText: "Discard" },
      ))
    ) {
      return;
    }

    setSelected(null);
    setEditingAccess(false);
    setError("");
    setMessage("");
  }

  function getDefaultPermissionIds(selectedRoleIds: readonly number[]) {
    return [...new Set(
      selectedRoleIds.flatMap((id) => roleDefaultPermissions[id] || []),
    )];
  }

  function updateSelectedRoles(nextRoleIds: number[]) {
    const previousDefaults = new Set(getDefaultPermissionIds(roleIds));
    const nextDefaults = new Set(getDefaultPermissionIds(nextRoleIds));
    const customGrants = new Set([
      ...permissionIds.filter((id) => !previousDefaults.has(id)),
      ...userGrantIds.filter((id) => permissionIds.includes(id)),
    ]);
    const customDenials = new Set(
      [
        ...[...previousDefaults].filter((id) => !permissionIds.includes(id)),
        ...userDenyIds.filter((id) => !permissionIds.includes(id)),
      ],
    );
    const nextPermissions = [
      ...[...nextDefaults].filter((id) => !customDenials.has(id)),
      ...[...customGrants].filter((id) => !customDenials.has(id)),
    ];
    setRoleIds(nextRoleIds);
    setPermissionIds([...new Set(nextPermissions)]);
    setUserGrantIds([...customGrants]);
    setUserDenyIds([...customDenials]);
  }

  function updatePermissionSelection(ids: number[]) {
    const defaults = new Set(getDefaultPermissionIds(roleIds));
    const grants = new Set([
      ...ids.filter((id) => !defaults.has(id)),
      ...userGrantIds.filter((id) => ids.includes(id)),
    ]);
    const denials = new Set([
      ...[...defaults].filter((id) => !ids.includes(id)),
      ...userDenyIds.filter((id) => !ids.includes(id)),
    ]);
    setPermissionIds(ids);
    setUserGrantIds([...grants]);
    setUserDenyIds([...denials]);
  }

  function toggleSelectedRole(roleId: number) {
    const nextRoleIds = roleIds.includes(roleId)
      ? roleIds.filter((id) => id !== roleId)
      : [...roleIds, roleId];
    updateSelectedRoles(nextRoleIds);
  }

  async function cancelAccessChanges() {
    const changed =
      roleIds.length !== savedRoleIds.length ||
      roleIds.some((id) => !savedRoleIds.includes(id)) ||
      permissionIds.length !== savedPermissionIds.length ||
      permissionIds.some((id) => !savedPermissionIds.includes(id));

    if (
      changed &&
      !(await window.crmPopup.confirm(
        "Discard the unsaved role changes?",
        { title: "Discard changes", confirmText: "Discard" },
      ))
    ) {
      return;
    }

    setRoleIds([...savedRoleIds]);
    setPermissionIds([...savedPermissionIds]);
    setUserGrantIds([...savedUserGrantIds]);
    setUserDenyIds([...savedUserDenyIds]);
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

    const confirmed = await window.crmPopup.confirm(
      `Are you sure you want to ${decision} this registration?`,
      {
        title: `Confirm ${decision}`,
        confirmText: decision === "approved" ? "Approve" : "Reject",
      },
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

      if (!result.ok) {
        throw new Error(result.message || "Unable to submit the review.");
      }

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

    const confirmed = await window.crmPopup.confirm(
      "Save the updated roles and effective permissions for this user?",
      { title: "Update user access", confirmText: "Save changes" },
    );

    if (!confirmed) return;

    setSavingAccess(true);
    setError("");
    setMessage("");

    try {
      await saveUserAccess(selected.id, roleIds, permissionIds);
      setSavedRoleIds([...roleIds]);
      setEditingAccess(false);

      try {
        const refreshed = await adminRegistrationApi.get(selected.id);
        setSelected(refreshed.data);

        const refreshedRoleIds = (refreshed.data.roles ?? [])
          .map((role) => Number(role.id))
          .filter(Number.isFinite);
        const refreshedPermissionIds = (refreshed.data.permissionIds ?? [])
          .map(Number)
          .filter(Number.isFinite);
        const refreshedEffectiveIds = (
          refreshed.data.effectivePermissions ?? []
        )
          .map((permission) => Number(permission.id))
          .filter(Number.isFinite);

        setRoleIds(refreshedRoleIds);
        setSavedRoleIds(refreshedRoleIds);
        setPermissionIds(refreshedPermissionIds);
        setSavedPermissionIds(refreshedPermissionIds);
        const refreshedGrants = (refreshed.data.permissionOverrides ?? [])
          .filter((override) => override.effect === "grant")
          .map((override) => Number(override.id))
          .filter(Number.isFinite);
        const refreshedDenials = (refreshed.data.permissionOverrides ?? [])
          .filter((override) => override.effect === "deny")
          .map((override) => Number(override.id))
          .filter(Number.isFinite);
        setUserGrantIds(refreshedGrants);
        setSavedUserGrantIds(refreshedGrants);
        setUserDenyIds(refreshedDenials);
        setSavedUserDenyIds(refreshedDenials);
        setEffectivePermissionIds(refreshedEffectiveIds);
        setMessage("Roles and effective permissions updated successfully.");
      } catch (refreshError) {
        const refreshMessage =
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to reload effective permissions.";
        setMessage("Roles were saved successfully.");
        setError(`Roles were saved, but the latest access could not be reloaded: ${refreshMessage}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update user roles.",
      );
    } finally {
      setSavingAccess(false);
    }
  }

  const registrationStatus = String(
    selected?.account_status ?? selected?.status ?? "",
  ).toLowerCase();

  const isPending = registrationStatus === "pending";
  const canEditAccess = isPending || editingAccess;
  const visiblePermissionIds = canEditAccess
    ? permissionIds
    : effectivePermissionIds;

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
                      "roleIds",
                      "permissionIds",
                      "permissionOverrides",
                      "effectivePermissions",
                      "permissions",
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
              {!isPending && !editingAccess ? (
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
              ) : !isPending && editingAccess ? (
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
              ) : null}
            </div>

            <div className="role-card">
              <h3>Assigned Roles</h3>
              {isPending && (
                <p className="registration-access-note">
                  Choose the roles and permissions to include with this approval.
                </p>
              )}

              <div className="role-chip-list">
                {roles.map((role) => (
                  <label key={role.id} className="role-chip">
                    <input
                      type="checkbox"
                      checked={roleIds.includes(Number(role.id))}
                      disabled={!isPending && !editingAccess}
                      onChange={() => toggleSelectedRole(Number(role.id))}
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>

              {!roles.length && (
                <p className="permission-empty">No roles available.</p>
              )}
            </div>

            <div
              className={
                isPending
                  ? "permission-card permission-card--matrix"
                  : "permission-card"
              }
            >
              {!isPending && <h3>Effective permissions</h3>}
              <PermissionMatrix
                permissions={permissions}
                selectedPermissionIds={visiblePermissionIds}
                defaultPermissionIds={getDefaultPermissionIds(roleIds)}
                onChange={updatePermissionSelection}
                onUpdated={() =>
                  setMessage(
                    isPending
                      ? "Permission selections updated. Approve the registration to submit them."
                      : "Permission selections updated. Save Changes to apply them.",
                  )
                }
                disabled={!canEditAccess}
              />
            </div>

            {!isPending && !editingAccess && (
              <p className="registration-access-note">
                Currently assigned roles and backend-provided permissions are
                shown above. Select Update Roles to make role changes.
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
                  disabled={reviewing}
                />

                <div className="registration-review-actions">
                  <button
                    type="button"
                    className="registration-approve-button"
                    disabled={reviewing}
                    onClick={() => void submitReview("approved")}
                  >
                    {reviewing ? "Saving..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    className="registration-reject-button"
                    disabled={reviewing}
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
