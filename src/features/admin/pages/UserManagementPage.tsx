import { useEffect, useState } from "react";
import { assignRole, getUsers, updateUserStatus, type AdminUser } from "../api/admin.api";
import "../styles/admin.css";

function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const payload = await getUsers();
      setUsers(payload);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load users.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatus(userId: string | number, status: string) {
    try {
      await updateUserStatus(userId, status);
      await loadUsers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update the user status.");
    }
  }

  async function handleRole(userId: string | number) {
    try {
      await assignRole(userId, ["ADMIN"]);
      await loadUsers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to assign the role.");
    }
  }

  return (
    <main className="admin-page">
      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <p className="auth-kicker">Admin</p>
            <h1>User management</h1>
          </div>
        </div>

        {error ? <div className="auth-error" role="alert">{error}</div> : null}

        {isLoading ? (
          <div className="auth-loading auth-loading--inline">Loading users...</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Roles</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No users are available.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={String(user.id)}>
                      <td>{user.name ?? "Unknown user"}</td>
                      <td>{user.email ?? "—"}</td>
                      <td>{user.status ?? "active"}</td>
                      <td>{user.roles?.join(", ") ?? "—"}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="mini-button" onClick={() => void handleStatus(user.id, "active")}>
                            Activate
                          </button>
                          <button type="button" className="mini-button mini-button--danger" onClick={() => void handleStatus(user.id, "inactive")}>
                            Deactivate
                          </button>
                          <button type="button" className="mini-button mini-button--secondary" onClick={() => void handleRole(user.id)}>
                            Assign admin
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default UserManagementPage;
