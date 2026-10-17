
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getCurrentUser,
  logoutSession,
} from "../../auth/api/auth.api";
import type { AuthUser } from "../types/auth.types";
import "../styles/ProfilePage.css";

function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const location = useLocation();

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((result) => {
        if (active) setUser(result);
      })
      .catch(() => {
        if (active) {
          setError("Unable to load your profile. Please sign in again.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <main className="account-page">Loading your profile...</main>;
  }

  if (error || !user) {
    return (
      <main className="account-page">
        <p className="account-error">
          {error || "Profile information is unavailable."}
        </p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </main>
    );
  }

  const name =
    user.full_name?.trim() || user.name?.trim() || user.email;

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const roles = user.roles ?? [];
  const permissions = user.permissions ?? [];

  const pageType = location.pathname;

  return (
    <main className="account-page">
      <div className="account-page-heading">
        <div>
          <p className="account-eyebrow">Account</p>
          <h1>
            {pageType === "/profile/permissions"
              ? "Roles & Permissions"
              : pageType === "/profile/settings"
                ? "Account Settings"
                : "My Profile"}
          </h1>
          <p>View your account information and access details.</p>
        </div>

        <Link className="account-back-link" to="/dashboard">
          ← Dashboard
        </Link>
      </div>

      <nav className="account-tabs" aria-label="Account navigation">
        <Link
          className={pageType === "/profile" ? "active" : ""}
          to="/profile"
        >
          My Profile
        </Link>
        <Link
          className={
            pageType === "/profile/permissions" ? "active" : ""
          }
          to="/profile/permissions"
        >
          Roles &amp; Permissions
        </Link>
        <Link
          className={pageType === "/profile/settings" ? "active" : ""}
          to="/profile/settings"
        >
          Account Settings
        </Link>
      </nav>

      {pageType === "/profile/permissions" ? (
        <section className="account-card">
          <h2>Assigned Roles</h2>
          {roles.length ? (
            <div className="account-badge-list">
              {roles.map((role) => (
                <span className="account-badge" key={role}>
                  {role.replace(/[_-]/g, " ")}
                </span>
              ))}
            </div>
          ) : (
            <p>No roles were returned by the authentication API.</p>
          )}

          <h2 className="account-section-heading">
            Assigned Permissions
          </h2>
          {permissions.length ? (
            <div className="account-permission-list">
              {permissions.map((permission) => (
                <div key={permission} className="account-permission">
                  <span>{permission}</span>
                  <span className="account-permission-status">
                    Assigned
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>
              No permissions were returned by the authentication API.
              Contact your administrator if this is unexpected.
            </p>
          )}
        </section>
      ) : pageType === "/profile/settings" ? (
        <section className="account-card">
          <h2>Account Settings</h2>
          <p>
            These details are managed by your CRM account and access
            configuration.
          </p>

          <div className="account-detail">
            <span>Account status</span>
            <strong>{user.status || "Not available"}</strong>
          </div>

          <div className="account-detail">
            <span>Registered email</span>
            <strong>{user.email}</strong>
          </div>

          <Link
            className="account-primary-link"
            to="/forgot-password"
          >
            Change Password
          </Link>
        </section>
      ) : (
        <section className="account-card">
          <div className="account-profile-summary">
            <div className="account-avatar">{initials || "U"}</div>
            <div>
              <h2>{name}</h2>
              <p>{user.email}</p>
              <span className="account-status">
                {user.status || "Status unavailable"}
              </span>
            </div>
          </div>

          <h2 className="account-section-heading">
            Personal Information
          </h2>

          <div className="account-detail">
            <span>Full name</span>
            <strong>{name}</strong>
          </div>

          <div className="account-detail">
            <span>Email address</span>
            <strong>{user.email}</strong>
          </div>

          <div className="account-detail">
            <span>Account status</span>
            <strong>{user.status || "Not available"}</strong>
          </div>

          <div className="account-detail">
            <span>Assigned roles</span>
            <strong>
              {roles.length
                ? roles.map((role) => role.replace(/[_-]/g, " ")).join(", ")
                : "No roles returned"}
            </strong>
          </div>

          <div className="account-actions">
            <Link
              className="account-primary-link"
              to="/forgot-password"
            >
              Change Password
            </Link>
            <Link className="account-secondary-link" to="/profile/permissions">
              View Roles &amp; Permissions
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

export default ProfilePage;
