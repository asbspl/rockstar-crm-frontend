import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  accessManagementApi,
  getUsers,
  type AccessOption,
  type AdminUser,
  type PermissionModule,
} from "../api/admin.api";
import PermissionMatrix from "../components/PermissionMatrix";
import { useAuthContext } from "../../../contexts/useAuthContext";
import "../styles/access-management.css";

type AccessTab = "roles" | "permissions";

export default function AccessManagementPage() {
  const { roles: actorRoles } = useAuthContext();
  const canManageDefinitions = actorRoles.some(
    (role) => role.toUpperCase() === "SUPER_ADMIN",
  );
  const [tab, setTab] = useState<AccessTab>("roles");
  const [roles, setRoles] = useState<AccessOption[]>([]);
  const [permissions, setPermissions] = useState<AccessOption[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedRole, setSelectedRole] = useState<AccessOption | null>(null);
  const [selectedRolePermissionIds, setSelectedRolePermissionIds] = useState<number[]>([]);
  const [selectedPermission, setSelectedPermission] = useState<AccessOption | null>(null);
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [moduleForm, setModuleForm] = useState({ name: "", key: "", description: "" });
  const [permissionForm, setPermissionForm] = useState({
    key: "",
    name: "",
    description: "",
    moduleId: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => Promise.all([
        accessManagementApi.listRoles(),
        accessManagementApi.listPermissions(),
        accessManagementApi.listModules(),
        getUsers(),
      ]), []);

  const applyData = useCallback((data: Awaited<ReturnType<typeof loadData>>) => {
    const [nextRoles, nextPermissions, nextModules, nextUsers] = data;
    setRoles(nextRoles);
    setPermissions(nextPermissions);
    setModules(nextModules);
    setUsers(nextUsers);
    setSelectedRole((current) =>
      current ? nextRoles.find((role) => role.id === current.id) ?? null : null,
    );
    setSelectedPermission((current) =>
      current
        ? nextPermissions.find((permission) => permission.id === current.id) ?? null
        : null,
    );
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      applyData(await loadData());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load role and permission definitions.",
      );
    } finally {
      setLoading(false);
    }
  }, [applyData, loadData]);

  useEffect(() => {
    let active = true;
    void loadData()
      .then((data) => {
        if (active) applyData(data);
      })
      .catch((caughtError: unknown) => {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load role and permission definitions.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyData, loadData]);

  const roleDefaultIds = useMemo(
    () => new Set(selectedRolePermissionIds),
    [selectedRolePermissionIds],
  );

  async function selectRole(role: AccessOption) {
    setSelectedRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || "",
    });
    setError("");
    setMessage("");
    try {
      const defaults = await accessManagementApi.getRolePermissions(Number(role.id));
      setSelectedRolePermissionIds(
        defaults
          .filter((permission) => permission.is_active !== false)
          .map((permission) => Number(permission.id)),
      );
    } catch (caughtError) {
      setSelectedRolePermissionIds([]);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load role defaults.",
      );
    }
  }

  async function saveRoleDetails() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (selectedRole) {
        await accessManagementApi.updateRole(Number(selectedRole.id), {
          name: roleForm.name,
          description: roleForm.description || null,
        });
        setMessage("Role updated.");
      } else {
        await accessManagementApi.createRole({
          name: roleForm.name,
          description: roleForm.description || undefined,
        });
        setRoleForm({ name: "", description: "" });
        setMessage("Role created.");
      }
      await reload();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save role.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRoleStatus() {
    if (!selectedRole) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await accessManagementApi.updateRole(Number(selectedRole.id), {
        isActive: selectedRole.is_active === false,
      });
      setMessage("Role status updated.");
      await reload();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update role.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole() {
    if (!selectedRole) return;
    const confirmed = await window.crmPopup.confirm(
      `Delete the ${selectedRole.name} role? Roles assigned to users cannot be deleted.`,
      { title: "Delete role", confirmText: "Delete role" },
    );
    if (!confirmed) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await accessManagementApi.deleteRole(Number(selectedRole.id));
      setSelectedRole(null);
      setSelectedRolePermissionIds([]);
      setRoleForm({ name: "", description: "" });
      setMessage("Role deleted.");
      await reload();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete role.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRoleDefaults() {
    if (!selectedRole) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await accessManagementApi.updateRolePermissions(
        Number(selectedRole.id),
        selectedRolePermissionIds,
      );
      setSelectedRolePermissionIds(saved.map((permission) => Number(permission.id)));
      setMessage("Role default permissions saved.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save role defaults.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function createModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await accessManagementApi.createModule({
        name: moduleForm.name,
        key: moduleForm.key || undefined,
        description: moduleForm.description || undefined,
      });
      setModuleForm({ name: "", key: "", description: "" });
      setMessage("Module created.");
      await reload();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create module.");
    } finally {
      setSaving(false);
    }
  }

  async function savePermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        key: permissionForm.key,
        name: permissionForm.name,
        description: permissionForm.description || undefined,
        moduleId: Number(permissionForm.moduleId),
      };
      if (selectedPermission) {
        await accessManagementApi.updatePermission(Number(selectedPermission.id), {
          ...payload,
          isActive: selectedPermission.is_active,
        });
        setMessage("Permission updated.");
      } else {
        await accessManagementApi.createPermission(payload);
        setMessage("Permission created.");
      }
      setSelectedPermission(null);
      setPermissionForm({ key: "", name: "", description: "", moduleId: "" });
      await reload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save permission.",
      );
    } finally {
      setSaving(false);
    }
  }

  function choosePermission(permission: AccessOption) {
    setSelectedPermission(permission);
    setPermissionForm({
      key: permission.key || permission.code || "",
      name: permission.name,
      description: permission.description || "",
      moduleId: String(permission.moduleId || ""),
    });
    setError("");
    setMessage("");
  }

  async function togglePermissionStatus(permission: AccessOption) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await accessManagementApi.updatePermission(Number(permission.id), {
        isActive: permission.is_active === false,
      });
      setMessage("Permission status updated.");
      await reload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to update permission.",
      );
    } finally {
      setSaving(false);
    }
  }

  const assignedUsers = selectedRole
    ? users.filter((user) => (user.roles || []).includes(String(selectedRole.code)))
    : [];

  return (
    <main className="access-management">
      <header className="access-management__header">
        <div>
          <p className="auth-kicker">Administration</p>
          <h1>Roles &amp; permissions</h1>
          <p>Manage database-driven roles, module definitions, and access defaults.</p>
        </div>
        <button type="button" className="access-management__button" onClick={() => void reload()} disabled={loading}>
          Refresh
        </button>
      </header>

      {error && <div className="auth-error" role="alert">{error}</div>}
      {message && <div className="auth-success" role="status">{message}</div>}

      <nav className="access-management__tabs" aria-label="Access management sections">
        <button type="button" className={tab === "roles" ? "active" : ""} onClick={() => setTab("roles")}>
          Manage roles
        </button>
        <button type="button" className={tab === "permissions" ? "active" : ""} onClick={() => setTab("permissions")}>
          Manage permissions
        </button>
      </nav>

      {loading ? (
        <div className="auth-loading auth-loading--inline" role="status">Loading access definitions...</div>
      ) : tab === "roles" ? (
        <section className="access-management__layout">
          <aside className="access-management__list-panel">
            <div className="access-management__section-heading">
              <h2>Roles</h2>
              <button
                type="button"
                className="access-management__text-button"
                onClick={() => {
                  setSelectedRole(null);
                  setSelectedRolePermissionIds([]);
                  setRoleForm({ name: "", description: "" });
                  setMessage("");
                  setError("");
                }}
              >
                + New role
              </button>
            </div>
            {roles.length === 0 ? (
              <p className="access-management__empty">No roles have been defined.</p>
            ) : roles.map((role) => (
              <button
                type="button"
                key={role.id}
                className={`access-management__list-item ${selectedRole?.id === role.id ? "selected" : ""}`}
                onClick={() => void selectRole(role)}
              >
                <span>
                  <strong>{role.name}</strong>
                  <small>{role.code}</small>
                </span>
                <span className={`access-management__status ${role.is_active === false ? "inactive" : ""}`}>
                  {role.is_active === false ? "Inactive" : "Active"}
                </span>
              </button>
            ))}
          </aside>

          <div className="access-management__content">
            <section className="access-management__card">
              <div className="access-management__section-heading">
                <div>
                  <h2>{selectedRole ? "Edit role" : "Create role"}</h2>
                  {selectedRole && (
                    <p>{selectedRole.assignedUserCount ?? 0} assigned user(s)</p>
                  )}
                </div>
                {selectedRole && (
                  <div className="access-management__inline-actions">
                    <button type="button" className="access-management__button secondary" onClick={() => void toggleRoleStatus()} disabled={saving}>
                      {selectedRole.is_active === false ? "Activate" : "Deactivate"}
                    </button>
                    <button type="button" className="access-management__button danger" onClick={() => void deleteRole()} disabled={saving || selectedRole.code === "SUPER_ADMIN"}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="access-management__form-grid">
                <label>
                  Role name
                  <input value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} maxLength={128} />
                </label>
                <label>
                  Description
                  <input value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} maxLength={2000} />
                </label>
              </div>
              <div className="access-management__actions">
                <button type="button" className="access-management__button" onClick={() => void saveRoleDetails()} disabled={saving || roleForm.name.trim().length < 2}>
                  {saving ? "Saving..." : selectedRole ? "Save role" : "Create role"}
                </button>
              </div>
            </section>

            {selectedRole && (
              <>
                <section className="access-management__card">
                  <div className="access-management__section-heading">
                    <div>
                      <h2>Role default permissions</h2>
                      <p>Newly assigned users inherit these permissions. User overrides remain separate.</p>
                    </div>
                    <button type="button" className="access-management__button" onClick={() => void saveRoleDefaults()} disabled={saving}>
                      {saving ? "Saving..." : "Save defaults"}
                    </button>
                  </div>
                  <PermissionMatrix
                    permissions={permissions}
                    selectedPermissionIds={[...roleDefaultIds]}
                    onChange={setSelectedRolePermissionIds}
                    disabled={saving || selectedRole.is_active === false}
                  />
                </section>
                <section className="access-management__card">
                  <h2>Users assigned to {selectedRole.name}</h2>
                  {assignedUsers.length === 0 ? (
                    <p className="access-management__empty">No users are assigned to this role.</p>
                  ) : (
                    <ul className="access-management__user-list">
                      {assignedUsers.map((user) => (
                        <li key={String(user.id)}>
                          <span>{user.full_name || user.name || "User"}</span>
                          <small>{user.email}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        </section>
      ) : (
        <section className="access-management__permissions">
          <section className="access-management__card">
            <div className="access-management__section-heading">
              <div>
                <h2>Modules</h2>
                <p>Permission groups are read from the database, not the frontend.</p>
              </div>
            </div>
            <div className="access-management__module-list">
              {modules.map((module) => (
                <div key={module.id}>
                  <strong>{module.name}</strong>
                  <small>{module.key} · {module.permissionCount ?? 0} permission(s)</small>
                </div>
              ))}
            </div>
            {canManageDefinitions && (
              <form className="access-management__form-grid" onSubmit={(event) => void createModule(event)}>
                <label>
                  Module name
                  <input required value={moduleForm.name} onChange={(event) => setModuleForm({ ...moduleForm, name: event.target.value })} />
                </label>
                <label>
                  Module key (optional)
                  <input value={moduleForm.key} onChange={(event) => setModuleForm({ ...moduleForm, key: event.target.value })} placeholder="inventory" />
                </label>
                <label className="access-management__form-wide">
                  Description
                  <input value={moduleForm.description} onChange={(event) => setModuleForm({ ...moduleForm, description: event.target.value })} />
                </label>
                <div className="access-management__actions access-management__form-wide">
                  <button type="submit" className="access-management__button" disabled={saving || moduleForm.name.trim().length < 2}>
                    Add module
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="access-management__card">
            <div className="access-management__section-heading">
              <div>
                <h2>Permission definitions</h2>
                <p>{permissions.length} permissions configured</p>
              </div>
            </div>
            <div className="access-management__permission-list">
              {permissions.map((permission) => (
                <div className="access-management__permission-row" key={permission.id}>
                  <button type="button" onClick={() => choosePermission(permission)}>
                    <strong>{permission.name}</strong>
                    <small>{permission.key || permission.code} · {permission.module}</small>
                  </button>
                  <span className={`access-management__status ${permission.is_active === false ? "inactive" : ""}`}>
                    {permission.is_active === false ? "Inactive" : "Active"}
                  </span>
                  {canManageDefinitions && (
                    <button type="button" className="access-management__text-button" onClick={() => void togglePermissionStatus(permission)} disabled={saving}>
                      {permission.is_active === false ? "Activate" : "Deactivate"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {canManageDefinitions && (
            <section className="access-management__card">
              <h2>{selectedPermission ? "Edit permission" : "Add permission"}</h2>
              <form className="access-management__form-grid" onSubmit={(event) => void savePermission(event)}>
                <label>
                  Permission key
                  <input required value={permissionForm.key} onChange={(event) => setPermissionForm({ ...permissionForm, key: event.target.value })} placeholder="inventory.read" />
                </label>
                <label>
                  Display name
                  <input required value={permissionForm.name} onChange={(event) => setPermissionForm({ ...permissionForm, name: event.target.value })} />
                </label>
                <label>
                  Module
                  <select required value={permissionForm.moduleId} onChange={(event) => setPermissionForm({ ...permissionForm, moduleId: event.target.value })}>
                    <option value="">Select a module</option>
                    {modules.filter((module) => module.is_active).map((module) => (
                      <option key={module.id} value={module.id}>{module.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Description
                  <input value={permissionForm.description} onChange={(event) => setPermissionForm({ ...permissionForm, description: event.target.value })} />
                </label>
                <div className="access-management__actions access-management__form-wide">
                  {selectedPermission && (
                    <button
                      type="button"
                      className="access-management__button secondary"
                      onClick={() => {
                        setSelectedPermission(null);
                        setPermissionForm({ key: "", name: "", description: "", moduleId: "" });
                      }}
                    >
                      Cancel edit
                    </button>
                  )}
                  <button type="submit" className="access-management__button" disabled={saving}>
                    {saving ? "Saving..." : selectedPermission ? "Save permission" : "Add permission"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </section>
      )}
    </main>
  );
}
