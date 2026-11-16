
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
import { useAuthContext } from "../../../contexts/useAuthContext";

import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ActionButton from "../../../components/common/ActionButton/ActionButton";

import "../styles/admin.css";

function getUserDisplayName(user: AdminUser): string {
  return (
    user.name?.trim() ||
    user.full_name?.trim() ||
    user.email ||
    "Unknown user"
  );
}

function UserManagementPage() {
  const { hasAnyPermission, hasAllPermissions } = useAuthContext();

  const canAssignUserAccess = hasAllPermissions([
    "users.assign_role",
    "users.permissions.update",
  ]);

  const canChangeUserStatus = hasAnyPermission([
    "users.suspend",
    "users.deactivate",
  ]);

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

  const [updatingUserId, setUpdatingUserId] = useState<
    string | number | null
  >(null);

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

  async function handleStatus(
    user: AdminUser,
    status: "active" | "inactive",
  ) {
    if (updatingUserId !== null) return;

    const confirmed = await window.crmPopup.confirm(
      `Change ${getUserDisplayName(user)} to ${status}?`,
      {
        title: "Update account status",
        confirmText: `Set ${status}`,
      },
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

      const availableRoles = allRoles.filter(
        (role) => role.is_active !== false,
      );

      const defaults = await Promise.all(
        availableRoles.map(async (role) => [
          Number(role.id),
          (
            await accessManagementApi.getRolePermissions(
              Number(role.id),
            )
          ).map((permission) => Number(permission.id)),
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
      {
        title: "Update user access",
        confirmText: "Save changes",
      },
    );

    if (!confirmed) return;

    setSavingRoles(true);
    setError(null);
    setMessage(null);

    try {
      await saveUserAccess(
        selectedUser.id,
        selectedRoleIds,
        selectedPermissionIds,
      );

      setSelectedUser(null);

      setMessage(
        "User roles and effective permissions updated.",
      );

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
    return [
      ...new Set(
        ids.flatMap((id) => roleDefaults[id] || []),
      ),
    ];
  }

  function toggleRole(roleId: number) {
    const previousDefaults = new Set(
      getRoleDefaultIds(selectedRoleIds),
    );

    const nextRoleIds = selectedRoleIds.includes(roleId)
      ? selectedRoleIds.filter((id) => id !== roleId)
      : [...selectedRoleIds, roleId];

    const nextDefaults = new Set(
      getRoleDefaultIds(nextRoleIds),
    );

    const grants = new Set([
      ...selectedPermissionIds.filter(
        (id) => !previousDefaults.has(id),
      ),
      ...userGrantIds.filter(
        (id) => selectedPermissionIds.includes(id),
      ),
    ]);

    const denials = new Set([
      ...[...previousDefaults].filter(
        (id) => !selectedPermissionIds.includes(id),
      ),
      ...userDenyIds.filter(
        (id) => !selectedPermissionIds.includes(id),
      ),
    ]);

    setSelectedRoleIds(nextRoleIds);

    setSelectedPermissionIds([
      ...new Set([
        ...[...nextDefaults].filter(
          (id) => !denials.has(id),
        ),
        ...[...grants].filter(
          (id) => !denials.has(id),
        ),
      ]),
    ]);

    setUserGrantIds([...grants]);
    setUserDenyIds([...denials]);
  }

  function updatePermissionSelection(ids: number[]) {
    const defaults = new Set(
      getRoleDefaultIds(selectedRoleIds),
    );

    setSelectedPermissionIds(ids);

    setUserGrantIds([
      ...new Set([
        ...ids.filter((id) => !defaults.has(id)),
        ...userGrantIds.filter((id) => ids.includes(id)),
      ]),
    ]);

    setUserDenyIds([
      ...new Set([
        ...[...defaults].filter((id) => !ids.includes(id)),
        ...userDenyIds.filter((id) => !ids.includes(id)),
      ]),
    ]);
  }

  function closeRoleEditor() {
    if (savingRoles) return;

    setSelectedUser(null);
  }

  return (
    <>
      <ManagementLayout
        title="User Management"
        description="Manage user status, assigned roles, and effective permissions."
        showForm={false}
        listTitle="User Directory"
        addButtonText=""
        onAdd={() => undefined}
        onBack={() => undefined}
        formTitle="Edit User Access"
        error={
          error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )
        }
        notice={
          message && (
            <div className="auth-success" role="status">
              {message}
            </div>
          )
        }
        toolbar={
          <div className="user-management-toolbar">
            <div className="user-management-toolbar__info">
              <span>
                Total users: <strong>{users.length}</strong>
              </span>
            </div>

            <div className="user-management-toolbar__actions manage-roles-permissions">
              {hasAllPermissions([
                "users.read",
                "permissions.read",
              ]) && (
                  <Link
                    className="mini-button mini-button--secondary"
                    to="/admin/access"
                  >
                    Manage roles &amp; permissions
                  </Link>
                )}
            </div>
          </div>
        }
      >
        {isLoading ? (
          <div
            className="auth-loading auth-loading--inline"
            role="status"
          >
            Loading users...
          </div>
        ) : (
          <table className="data-table data-table--users user-management-table">
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
                  <td colSpan={6}>
                    No users are available.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const active =
                    String(user.status ?? "").toLowerCase() ===
                    "active";

                  const busy = updatingUserId === user.id;

                  return (
                    <tr key={String(user.id)}>
                      <td data-label="Name">
                        {getUserDisplayName(user)}
                      </td>

                      <td data-label="Email">
                        {user.email ?? "—"}
                      </td>

                      <td data-label="Status">
                        <span
                          className={`status-badge ${active
                              ? "status-badge--active"
                              : "status-badge--inactive"
                            }`}
                        >
                          {user.status ?? "Unknown"}
                        </span>
                      </td>

                      <td data-label="Roles">
                        {user.roles?.join(", ") || "—"}
                      </td>

                      <td data-label="Active permissions">
                        {user.permissions?.length
                          ? `${user.permissions.length} active`
                          : "None"}
                      </td>

                      <td data-label="Actions">
                        <div className="table-actions">
                          {canAssignUserAccess && (
                            <ActionButton
                              action="cancel"
                              className="user-management-edit-access"
                              onClick={() =>
                                void openRoleEditor(user)
                              }
                              disabled={
                                busy || savingRoles
                              }
                            >
                              Edit access
                            </ActionButton>
                          )}

                          {canChangeUserStatus && (
                            <ActionButton
                              action="cancel"
                              className={
                                active
                                  ? "user-management-deactivate"
                                  : "user-management-activate"
                              }
                              onClick={() =>
                                void handleStatus(
                                  user,
                                  active
                                    ? "inactive"
                                    : "active",
                                )
                              }
                              disabled={
                                busy || savingRoles
                              }
                            >
                              {busy
                                ? "Updating..."
                                : active
                                  ? "Deactivate"
                                  : "Activate"}
                            </ActionButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </ManagementLayout>

      {selectedUser && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !savingRoles
            ) {
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

                <h2 id="user-role-dialog-title">
                  Edit roles &amp; permissions
                </h2>

                <p>
                  {getUserDisplayName(selectedUser)}
                </p>
              </div>

              <ActionButton
                action="cancel"
                className="user-management-close"
                onClick={closeRoleEditor}
                disabled={savingRoles}
              >
                Close
              </ActionButton>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            {rolesLoading ? (
              <div
                className="auth-loading auth-loading--inline"
                role="status"
              >
                Loading available roles...
              </div>
            ) : roles.length === 0 ? (
              <p>No roles are available from the backend.</p>
            ) : (
              <div className="admin-role-options">
                {roles.map((role) => {
                  const roleId = Number(role.id);

                  return (
                    <label
                      className="admin-role-option"
                      key={role.id}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(
                          roleId,
                        )}
                        onChange={() =>
                          toggleRole(roleId)
                        }
                        disabled={
                          savingRoles ||
                          !canAssignUserAccess
                        }
                      />

                      <span>
                        <strong>{role.name}</strong>

                        {role.description && (
                          <small>
                            {role.description}
                          </small>
                        )}
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
                  selectedPermissionIds={
                    selectedPermissionIds
                  }
                  defaultPermissionIds={getRoleDefaultIds(
                    selectedRoleIds,
                  )}
                  onChange={updatePermissionSelection}
                  disabled={
                    savingRoles ||
                    !canAssignUserAccess
                  }
                />
              </div>
            )}

            <div className="admin-modal__actions">
              <ActionButton
                action="cancel"
                onClick={closeRoleEditor}
                disabled={savingRoles}
              >
                Cancel
              </ActionButton>

              {canAssignUserAccess && (
                <ActionButton
                  action="update"
                  onClick={() => void saveRoles()}
                  disabled={
                    rolesLoading || savingRoles
                  }
                >
                  {savingRoles
                    ? "Saving..."
                    : "Save changes"}
                </ActionButton>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default UserManagementPage;
