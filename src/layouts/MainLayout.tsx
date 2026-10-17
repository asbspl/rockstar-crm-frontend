import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import ProfileMenu from "..//features/auth/components/ProfileMenu.tsx";
import "./main-layout.css";

const navigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "bi-speedometer2",
  },
  {
    label: "Customers",
    path: "/admin/users",
    icon: "bi-people",
  },
  {
    label: "Registration Requests",
    path: "/admin/registrations",
    icon: "bi-person-check",
  },
  {
    label: "Applications",
    path: "/admin/applications",
    icon: "bi-clipboard-check",
  },
  {
    label: "Settings",
    path: "/admin/settings",
    icon: "bi-gear",
  },
];

function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="crm-layout">
      {menuOpen && (
        <button
          type="button"
          className="crm-sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`crm-sidebar ${menuOpen ? "crm-sidebar-open" : ""}`}
      >
        <Link
          to="/dashboard"
          className="crm-brand"
          onClick={() => setMenuOpen(false)}
        >
          <span className="crm-brand-icon">
            <i className="bi bi-layers-fill" />
          </span>

          <span>
            <strong>ROCKSTAR</strong>
            <small>CRM MANAGEMENT</small>
          </span>
        </Link>

        <div className="crm-nav-heading">WORKSPACE</div>

        <nav className="crm-navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `crm-nav-link ${isActive ? "active" : ""}`
              }
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="crm-sidebar-footer">
          <div className="crm-user-avatar">SA</div>
          <div className="crm-user-info">
            <strong>Administrator</strong>
            <small>CRM Management</small>
          </div>
        </div>
      </aside>

      <div className="crm-main">
        <header className="crm-topbar">
          <button
            type="button"
            className="crm-menu-toggle"
            aria-label="Toggle sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <i className="bi bi-list" />
          </button>

          <div className="crm-breadcrumb">
            <span>Rockstar CRM</span>
            <i className="bi bi-chevron-right" />
            <strong>Workspace</strong>
          </div>

          <div className="crm-topbar-right">
            <ProfileMenu />
          </div>
        </header>

        <main className="crm-page-content">
          <Outlet />
        </main>

        <footer className="crm-footer">
          Rockstar CRM · Administration
        </footer>
      </div>
    </div>
  );
}

export default MainLayout;