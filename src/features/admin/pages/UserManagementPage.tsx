import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  accessManagementApi,
  getUserAccess,
  getUsers,
  saveUserAccess,
  updateUserStatus,
  type AdminUser,
  type AccessOption,
} from "../api/admin.api";
import PermissionMatrix from "../components/PermissionMatrix";
import "../styles/admin.css";

function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [roles, setRoles] = useState<AccessOption[]>([]);
  const [permissions, setPermissions] = useState<AccessOption[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<Record<number, number[]>>({});
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [userGrantIds, setUserGrantIds] = useState<number[]>([]);
  const [userDenyIds, setUserDenyIds] = useState<number[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | number | null>(
    null,
  );

  const fetchUsers = useCallback(async () => getUsers(), []);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setUsers(await fetchUsers());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load users.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    let active = true;

    void fetchUsers()
      .then((loadedUsers) => {
        if (active) setUsers(loadedUsers);
      })
      .catch((caughtError: unknown) => {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load users.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchUsers]);

  async function handleStatus(user: AdminUser, status: "active" | "inactive") {
    if (updatingUserId !== null) return;

    const confirmed = await window.crmPopup.confirm(
      `Change ${user.name ?? user.full_name ?? user.email ?? "this user"} to ${status}?`,
      { title: "Update account status", confirmText: `Set ${status}` },
    );

    if (!confirmed) return;

    setUpdatingUserId(user.id);
    setError(null);
    setMessage(null);

    try {
      await updateUserStatus(user.id, status);
      setMessage("User status updated.");
      await loadUsers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update the user status.",
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function openRoleEditor(user: AdminUser) {
    setSelectedUser(user);
    setRoles([]);
    setError(null);
    setMessage(null);
    setRolesLoading(true);

    try {
      const [allRoles, allPermissions, access] = await Promise.all([
        accessManagementApi.listRoles(),
        accessManagementApi.listPermissions(),
        getUserAccess(user.id),
      ]);
      const availableRoles = allRoles.filter((role) => role.is_active !== false);
      const defaults = await Promise.all(
        availableRoles.map(async (role) => [
          Number(role.id),
          (await accessManagementApi.getRolePermissions(Number(role.id)))
            .map((permission) => Number(permission.id)),
        ] as const),
      );
      setRoles(availableRoles);
      setPermissions(allPermissions);
      setRoleDefaults(Object.fromEntries(defaults));
      setSelectedRoleIds(access.roleIds);
      setSelectedPermissionIds(access.permissionIds);
      setUserGrantIds(
        access.overrides
          .filter((override) => override.effect === "grant")
          .map((override) => Number(override.id)),
      );
      setUserDenyIds(
        access.overrides
          .filter((override) => override.effect === "deny")
          .map((override) => Number(override.id)),
      );
    } catch (caughtError) {
      setSelectedUser(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load available roles.",
      );
    } finally {
      setRolesLoading(false);
    }
  }

  async function saveRoles() {
    if (!selectedUser || savingRoles) return;

    const confirmed = await window.crmPopup.confirm(
      "Save this user's roles and effective permissions?",
      { title: "Update user access", confirmText: "Save changes" },
    );
    if (!confirmed) return;

    setSavingRoles(true);
    setError(null);
    setMessage(null);

    try {
      await saveUserAccess(selectedUser.id, selectedRoleIds, selectedPermissionIds);
      setSelectedUser(null);
      setMessage("User roles and effective permissions updated.");
      await loadUsers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to assign roles.",
      );
    } finally {
      setSavingRoles(false);
    }
  }

  function getRoleDefaultIds(ids: readonly number[]) {
    return [...new Set(ids.flatMap((id) => roleDefaults[id] || []))];
  }

  function toggleRole(roleId: number) {
    const previousDefaults = new Set(getRoleDefaultIds(selectedRoleIds));
    const nextRoleIds = selectedRoleIds.includes(roleId)
      ? selectedRoleIds.filter((id) => id !== roleId)
      : [...selectedRoleIds, roleId];
    const nextDefaults = new Set(getRoleDefaultIds(nextRoleIds));
    const grants = new Set([
      ...selectedPermissionIds.filter((id) => !previousDefaults.has(id)),
      ...userGrantIds.filter((id) => selectedPermissionIds.includes(id)),
    ]);
    const denials = new Set(
      [
        ...[...previousDefaults].filter((id) => !selectedPermissionIds.includes(id)),
        ...userDenyIds.filter((id) => !selectedPermissionIds.includes(id)),
      ],
    );
    setSelectedRoleIds(nextRoleIds);
    setSelectedPermissionIds([...new Set([
      ...[...nextDefaults].filter((id) => !denials.has(id)),
      ...[...grants].filter((id) => !denials.has(id)),
    ])]);
    setUserGrantIds([...grants]);
    setUserDenyIds([...denials]);
  }

  function updatePermissionSelection(ids: number[]) {
    const defaults = new Set(getRoleDefaultIds(selectedRoleIds));
    setSelectedPermissionIds(ids);
    setUserGrantIds([...new Set([
      ...ids.filter((id) => !defaults.has(id)),
      ...userGrantIds.filter((id) => ids.includes(id)),
    ])]);
    setUserDenyIds([...new Set([
      ...[...defaults].filter((id) => !ids.includes(id)),
      ...userDenyIds.filter((id) => !ids.includes(id)),
    ])]);
  }

  return (
    <main className="admin-page">
      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <p className="auth-kicker">Admin</p>
            <h1>User management</h1>
            <p>Manage user status, assigned roles, and effective permissions.</p>
          </div>
          <div className="admin-panel__header-actions">
            <Link className="mini-button mini-button--secondary" to="/admin/access">
              Manage roles &amp; permissions
            </Link>
            <button
              type="button"
              className="mini-button"
              onClick={() => void loadUsers()}
              disabled={isLoading || updatingUserId !== null}
            >
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}
        {message && <div className="auth-success" role="status">{message}</div>}

        {isLoading ? (
          <div className="auth-loading auth-loading--inline" role="status">
            Loading users...
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Roles</th>
                  <th>Active permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No users are available.</td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const active =
                      String(user.status ?? "").toLowerCase() === "active";
                    const busy = updatingUserId === user.id;

                    return (
                      <tr key={String(user.id)}>
                        <td>{user.name ?? user.full_name ?? "Unknown user"}</td>
                        <td>{user.email ?? "—"}</td>
                        <td>{user.status ?? "Unknown"}</td>
                        <td>{user.roles?.join(", ") || "—"}</td>
                        <td>
                          {user.permissions?.length
                            ? `${user.permissions.length} active`
                            : "None"}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="mini-button mini-button--secondary"
                              onClick={() => void openRoleEditor(user)}
                              disabled={busy || savingRoles}
                            >
                              Edit access
                            </button>
                            <button
                              type="button"
                              className={
                                active
                                  ? "mini-button mini-button--danger"
                                  : "mini-button"
                              }
                              onClick={() =>
                                void handleStatus(
                                  user,
                                  active ? "inactive" : "active",
                                )
                              }
                              disabled={busy || savingRoles}
                            >
                              {busy
                                ? "Updating..."
                                : active
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                          </div>
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

      {selectedUser && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingRoles) {
              setSelectedUser(null);
              setError(null);
            }
          }}
        >
          <section
            className="admin-modal admin-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-role-dialog-title"
          >
            <div className="admin-modal__header">
              <div>
                <p className="auth-kicker">User access</p>
                <h2 id="user-role-dialog-title">Edit roles &amp; permissions</h2>
                <p>
                  {selectedUser.name ??
                    selectedUser.full_name ??
                    selectedUser.email ??
                    "Selected user"}
                </p>
              </div>
              <button
                type="button"
                className="mini-button mini-button--secondary"
                onClick={() => setSelectedUser(null)}
                disabled={savingRoles}
                aria-label="Close role assignment"
              >
                Close
              </button>
            </div>

            {error && <div className="auth-error" role="alert">{error}</div>}

            {rolesLoading ? (
              <div className="auth-loading auth-loading--inline" role="status">
                Loading available roles...
              </div>
            ) : roles.length === 0 ? (
              <p>No roles are available from the backend.</p>
            ) : (
              <div className="admin-role-options">
                {roles.map((role) => {
                  const roleId = Number(role.id);

                  return (
                    <label className="admin-role-option" key={role.id}>
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(roleId)}
                        onChange={() => toggleRole(roleId)}
                        disabled={savingRoles}
                      />
                      <span>
                        <strong>{role.name}</strong>
                        {role.description && <small>{role.description}</small>}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {!rolesLoading && permissions.length > 0 && (
              <div className="admin-user-permissions">
                <h3>Effective permissions</h3>
                <PermissionMatrix
                  permissions={permissions}
                  selectedPermissionIds={selectedPermissionIds}
                  defaultPermissionIds={getRoleDefaultIds(selectedRoleIds)}
                  onChange={updatePermissionSelection}
                  disabled={savingRoles}
                />
              </div>
            )}

            <div className="admin-modal__actions">
              <button
                type="button"
                className="mini-button mini-button--secondary"
                onClick={() => setSelectedUser(null)}
                disabled={savingRoles}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mini-button"
                onClick={() => void saveRoles()}
                disabled={rolesLoading || savingRoles}
              >
                {savingRoles ? "Saving..." : "Save changes"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default UserManagementPage;
