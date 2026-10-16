
import { useCallback, useEffect, useState } from "react";
import {
    adminRegistrationApi,
    type AccessOption,
    type Registration,
    type RegistrationDetails,
    type RegistrationStatus,
} from "../api/admin.api";
import "./RegistrationManagement.css";

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

    if (!entries.length) {
        return (
            <section className="registration-detail-section">
                <h3>{title}</h3>
                <p>No information provided.</p>
            </section>
        );
    }

    return (
        <section className="registration-detail-section">
            <h3>{title}</h3>
            <dl className="registration-detail-grid">
                {entries.map(([key, item]) => (
                    <div key={key}>
                        <dt>{key.replace(/_/g, " ")}</dt>
                        <dd>{formatValue(item)}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

export default function RegistrationManagement() {
    const [status, setStatus] =
        useState<RegistrationStatus | "all">("all");
    const [registrations, setRegistrations] =
        useState<Registration[]>([]);
    const [selected, setSelected] =
        useState<RegistrationDetails | null>(null);

    const [roles, setRoles] = useState<AccessOption[]>([]);
    const [permissions, setPermissions] = useState<AccessOption[]>([]);
    const [roleIds, setRoleIds] = useState<number[]>([]);
    const [permissionIds, setPermissionIds] = useState<number[]>([]);
    const [effectivePermissionIds, setEffectivePermissionIds] =
        useState<number[]>([]);
    const [decisionReason, setDecisionReason] = useState("");

    const [loading, setLoading] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const loadRegistrations = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await adminRegistrationApi.list(
                status === "all" ? undefined : status
            );

            setRegistrations(result.data || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load registrations."
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
                            : "Unable to load roles and permissions."
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

        try {
            const result = await adminRegistrationApi.get(registration.id);
            const details = result.data;

            setSelected(details);

            setRoleIds(
                (details.roles ?? []).map((role) => Number(role.id))
            );

            setPermissionIds(
                (details.permissionIds ?? []).map((id) => Number(id))
            );

            setEffectivePermissionIds(
                (details.effectivePermissions ?? []).map(
                    (permission) => Number(permission.id)
                )
            );

            setDecisionReason("");
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
        current: number[],
        update: (ids: number[]) => void
    ) {
        update(
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    }

    async function submitReview(
        decision: "approved" | "rejected"
    ) {
        if (!selected || reviewing) return;

        if (decision === "approved" && roleIds.length === 0) {
            setError("Select at least one role before approving.");
            return;
        }

        if (decision === "rejected" && !decisionReason.trim()) {
            setError("Enter a reason for rejecting this registration.");
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to ${decision} this registration?`
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
            await loadRegistrations();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to submit the review."
            );
        } finally {
            setReviewing(false);
        }
    }

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
                        onClick={() => setSelected(null)}
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
                                    registrations.map((registration) => (
                                        <tr
                                            key={registration.id}
                                            onClick={() => void openRegistration(registration)}
                                            className="registration-clickable-row"
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
                                                        registration.created_at
                                                    ).toLocaleDateString()
                                                    : "—"}
                                            </td>
                                            <td>


                                                <span
                                                    className={`registration-status ${registration.account_status ?? registration.status ?? "pending"
                                                        }`}
                                                >
                                                    {(registration.account_status ?? registration.status ?? "pending").replace(
                                                        /_/g,
                                                        " ",
                                                    )}
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
                                    ))
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
                                id: selected.id,
                                full_name: selected.full_name,
                                email: selected.email,
                                phone:
                                    selected.phone ||
                                    selected.phone_number ||
                                    null,
                                account_status: selected.account_status,
                                created_at: selected.created_at,
                            }}
                        />

                        <DetailSection title="Profile Information" value={selected.profile} />
                        <DetailSection title="KYC Information" value={selected.kyc} />
                        <DetailSection title="Bank Information" value={selected.bank} />
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
                                            "profile",
                                            "kyc",
                                            "bank",
                                        ].includes(key)
                                )
                            )}
                        />
                    </section>

                    <aside className="registration-access-panel">
                        <h2>Assign Roles</h2>
                        <p>Select the role or roles for this user.</p>

                        {roles.length === 0 ? (
                            <p>No roles available.</p>
                        ) : (
                            roles.map((role) => (
                                <label className="registration-option" key={role.id}>
                                    <input
                                        type="checkbox"
                                        checked={roleIds.includes(role.id)}
                                        onChange={() =>
                                            toggleId(role.id, roleIds, setRoleIds)
                                        }
                                    />
                                    <span>{role.name}</span>
                                </label>
                            ))
                        )}

                        <hr />

                        <h2>Assign Permissions</h2>
                        <p>
                            Select only the permissions this user should receive directly.
                            Permissions inherited through roles must also be enforced by
                            the backend.
                        </p>

                        {permissions.length === 0 ? (
                            <p>No permissions available.</p>
                        ) : (
                            permissions.map((permission) => (
                                <label
                                    className="registration-option"
                                    key={permission.id}
                                >
                                    <input
                                        type="checkbox"
                                        checked={
                                            permissionIds.includes(permission.id) ||
                                            effectivePermissionIds.includes(permission.id)
                                        }
                                        
                                        onChange={() =>
                                            toggleId(
                                                permission.id,
                                                permissionIds,
                                                setPermissionIds
                                            )
                                        }
                                    />
                                    <span>
                                        {permission.name}
                                        {permission.description && (
                                            <small>{permission.description}</small>
                                        )}
                                    </span>
                                </label>
                            ))
                        )}

                        <hr />

                        <label
                            className="registration-reason-label"
                            htmlFor="registration-review-reason"
                        >
                            Review / rejection reason
                        </label>
                        <textarea
                            id="registration-review-reason"
                            value={decisionReason}
                            onChange={(event) =>
                                setDecisionReason(event.target.value)
                            }
                            placeholder="Enter review notes or the rejection reason..."
                            rows={3}
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
                    </aside>
                </div>
            )}
        </main>
    );
}
