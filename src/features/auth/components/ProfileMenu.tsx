import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  logoutSession,
} from "../api/auth.api";
import type { AuthUser } from "../types/auth.types";
import "../styles/ProfileMenu.css";

function ProfileMenu() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoadingUser(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const displayName =
    user?.full_name?.trim() ||
    user?.name?.trim() ||
    user?.email ||
    "My Account";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "U";

  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logoutSession();
    } finally {
      setProfileOpen(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="profile-menu-wrapper" ref={profileRef}>
      <button
        type="button"
        className="profile-trigger"
        aria-label="Open user profile menu"
        aria-haspopup="menu"
        aria-expanded={profileOpen}
        onClick={() => setProfileOpen((open) => !open)}
      >
        <span className="profile-avatar">
          {loadingUser ? "…" : initials}
        </span>

        <span className="profile-trigger-details">
          <strong>
            {loadingUser ? "Loading profile..." : displayName}
          </strong>
          <small>
            {roles.length > 0 ? roles.join(", ") : "Account"}
          </small>
        </span>

        <span className="profile-chevron" aria-hidden="true">
          {profileOpen ? "▲" : "▼"}
        </span>
      </button>

      {profileOpen && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-heading">
            <span className="profile-avatar profile-avatar-large">
              {initials}
            </span>

            <div className="profile-identity">
              <strong>{displayName}</strong>
              <span>{user?.email ?? "Email unavailable"}</span>
              <small>
                {user?.status
                  ? `Account: ${user.status.replace(/_/g, " ")}`
                  : "Account details"}
              </small>
            </div>
          </div>

          <div className="profile-dropdown-divider" />

          <Link
            to="/profile"
            className="profile-menu-item"
            role="menuitem"
            onClick={() => setProfileOpen(false)}
          >
            <span>👤</span>
            <span>
              <strong>My Profile</strong>
              <small>View your personal details</small>
            </span>
          </Link>

          <Link
            to="/profile/permissions"
            className="profile-menu-item"
            role="menuitem"
            onClick={() => setProfileOpen(false)}
          >
            <span>🛡️</span>
            <span>
              <strong>Roles &amp; Permissions</strong>
              <small>
                {roles.length} role(s), {permissions.length} permission(s)
              </small>
            </span>
          </Link>

          <Link
            to="/forgot-password"
            className="profile-menu-item"
            role="menuitem"
            onClick={() => setProfileOpen(false)}
          >
            <span>🔑</span>
            <span>
              <strong>Change Password</strong>
              <small>Update your login password</small>
            </span>
          </Link>

          <Link
            to="/profile/settings"
            className="profile-menu-item"
            role="menuitem"
            onClick={() => setProfileOpen(false)}
          >
            <span>⚙️</span>
            <span>
              <strong>Account Settings</strong>
              <small>View account information</small>
            </span>
          </Link>

          <div className="profile-dropdown-divider" />

          <button
            type="button"
            className="profile-menu-item profile-logout"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <span>↪</span>
            <span>
              <strong>
                {loggingOut ? "Logging out..." : "Logout"}
              </strong>
              <small>End your current session</small>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
