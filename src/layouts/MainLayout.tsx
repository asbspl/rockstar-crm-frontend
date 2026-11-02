import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuthContext } from "../contexts/useAuthContext";
import ProfileMenu from "../features/auth/components/ProfileMenu.tsx";
import "./main-layout.css";

type MenuItem = {
  label: string;
  path: string;
  icon: string;
  requiredPermission: string;
  requiredRoles?: readonly string[];
};

type NavigationItem =
  | {
      label: string;
      path: string;
      icon: string;
      type: "link";
      requiredPermission?: string;
      requiredRoles?: readonly string[];
    }
  | {
      label: string;
      icon: string;
      type: "menu";
      items: MenuItem[];
    };

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "bi-grid-1x2-fill",
    type: "link",
    requiredPermission: "dashboard.read",
  },
  {
    label: "Settings",
    icon: "bi-sliders",
    type: "menu",
    items: [
      { label: "Manage Company", path: "/settings/companies", icon: "bi-buildings", requiredPermission: "", requiredRoles: ["ADMIN", "SUPER_ADMIN"] },
      { label: "Manage Employee", path: "/settings/employees", icon: "bi-person-badge", requiredPermission: "", requiredRoles: ["ADMIN", "SUPER_ADMIN"] },
      { label: "Manage Driver", path: "/settings/drivers", icon: "bi-truck-front", requiredPermission: "", requiredRoles: ["ADMIN", "SUPER_ADMIN"] },
      { label: "Manage Contractor", path: "/settings/contractors", icon: "bi-people-fill", requiredPermission: "", requiredRoles: ["ADMIN", "SUPER_ADMIN"] },
      // { label: "Manage State", path: "/settings/states", icon: "bi-map" },
      // { label: "Manage City", path: "/settings/cities", icon: "bi-buildings-fill" },
    ],
  },
  {
    label: "Customers",
    icon: "bi-people",
    type: "menu",
    items: [
      { label: "Manage Client", path: "/customers/clients", icon: "bi-person-lines-fill", requiredPermission: "customers.read" },
      { label: "Manage Customer", path: "/customers/customers", icon: "bi-person-heart", requiredPermission: "customers.read" },
      { label: "Manage Location", path: "/customers/locations", icon: "bi-geo-alt", requiredPermission: "", requiredRoles: ["ADMIN", "SUPER_ADMIN"] },
      { label: "Manage Site", path: "/customers/sites", icon: "bi-pin-map", requiredPermission: "sites.read" },
      { label: "Manage Quotation", path: "/customers/quotations", icon: "bi-file-earmark-text", requiredPermission: "quotations.read" },
      { label: "Manage Order", path: "/customers/orders", icon: "bi-bag-check", requiredPermission: "orders.read" },
      // { label: "Manage Visit", path: "/customers/visits", icon: "bi-calendar2-week" },
      // { label: "Manage Queries", path: "/customers/queries", icon: "bi-chat-square-dots" },
    ],
  },
  {
    label: "Product",
    icon: "bi-box-seam",
    type: "menu",
    items: [
      { label: "Manage Product", path: "/products/products", icon: "bi-boxes", requiredPermission: "", requiredRoles: ["ADMIN", "SUPER_ADMIN"] },
      { label: "Manage Rate Matrix", path: "/products/rate-matrix", icon: "bi-calculator", requiredPermission: "", requiredRoles: ["ADMIN", "SUPER_ADMIN"] },
      // { label: "Manage Coupon", path: "/settings/coupons", icon: "bi-ticket-perforated" },
    ],
  },
  {
    label: "Registration Requests",
    path: "/admin/registrations",
    icon: "bi-person-vcard",
    type: "link",
    requiredPermission: "users.read",
    requiredRoles: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "Applications",
    path: "/admin/applications",
    icon: "bi-clipboard2-check",
    type: "link",
    requiredPermission: "users.read",
    requiredRoles: ["ADMIN", "SUPER_ADMIN"],
  },
{
  label: "User Activity",
  path: "/admin/user-activity",
  icon: "bi-activity",
  type: "link",
  requiredPermission: "audit_logs.read",
  requiredRoles: ["ADMIN", "SUPER_ADMIN"],
},
];

function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { user, roles, hasPermission } = useAuthContext();
  const isAdmin = roles.some((role) =>
    ["admin", "super_admin"].includes(role.trim().toLowerCase()),
  );
  const displayName = user?.full_name ?? user?.name ?? user?.email ?? "User";
  const avatar = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const hasRole = (requiredRoles?: readonly string[]) =>
    !requiredRoles ||
    requiredRoles.some((requiredRole) =>
      roles.some(
        (role) => role.trim().toLowerCase() === requiredRole.toLowerCase(),
      ),
    );

  const closeSidebar = () => setMenuOpen(false);

  const toggleMenu = (label: string) => {
    setExpanded((current) => (current === label ? null : label));
  };

  return (
    <div className="crm-layout">
      {menuOpen && (
        <button
          type="button"
          className="crm-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`crm-sidebar ${menuOpen ? "crm-sidebar-open" : ""}`}
      >
        <Link
          to="/dashboard"
          className="crm-brand"
          onClick={() => {
            closeSidebar();
            setExpanded(null);
          }}
        >
          <span className="crm-brand-icon">
            <i className="bi bi-stars" />
          </span>

          <span className="crm-brand-text">
            <strong>ROCKSTAR</strong>
            <small>CRM PLATFORM</small>
          </span>
        </Link>

        <div className="crm-workspace-label">WORKSPACE</div>

        <nav className="crm-navigation" aria-label="Main navigation">
          {navigation.map((item) => {
            if (item.type === "link") {
              if (
                (item.requiredPermission &&
                  !hasPermission(item.requiredPermission)) ||
                !hasRole(item.requiredRoles)
              ) {
                return null;
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    closeSidebar();
                    setExpanded(null);
                  }}
                  className={({ isActive }) =>
                    `crm-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className={`bi ${item.icon}`} />
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            const isOpen = expanded === item.label;
            const visibleItems = item.items.filter(
              (subItem) =>
                (subItem.requiredPermission.length > 0 &&
                  hasPermission(subItem.requiredPermission)) ||
                Boolean(
                  subItem.requiredRoles && hasRole(subItem.requiredRoles),
                ),
            );
            if (visibleItems.length === 0) return null;

            return (
              <section className="crm-menu-section" key={item.label}>
                <button
                  type="button"
                  className="crm-menu-heading"
                  onClick={() => toggleMenu(item.label)}
                  aria-expanded={isOpen}
                >
                  <span className="crm-menu-heading-left">
                    <span className="crm-menu-icon">
                      <i className={`bi ${item.icon}`} />
                    </span>
                    <span>{item.label}</span>
                  </span>

                  <i
                    className={`bi ${
                      isOpen ? "bi-chevron-down" : "bi-chevron-right"
                    } crm-chevron`}
                  />
                </button>

                {isOpen && (
                  <div className="crm-submenu">
                    {visibleItems.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        onClick={closeSidebar}
                        className={({ isActive }) =>
                          `crm-submenu-link ${isActive ? "active" : ""}`
                        }
                      >
                        <i className={`bi ${subItem.icon}`} />
                        <span>{subItem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </nav>

        <div className="crm-sidebar-help">
          <span className="crm-help-icon">
            <i className="bi bi-lightbulb" />
          </span>
          <div>
            <strong>Need a hand?</strong>
            <small>You're doing great!</small>
          </div>
        </div>

        <div className="crm-sidebar-footer">
          <div className="crm-user-avatar">{avatar || "U"}</div>
          <div className="crm-user-info">
            <strong>{displayName}</strong>
            <small>{isAdmin ? "Workspace admin" : user?.email ?? "CRM user"}</small>
          </div>
          {isAdmin && <i className="bi bi-shield-check crm-admin-shield" />}
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
            <span className="crm-breadcrumb-home">
              <i className="bi bi-house-door" />
              Rockstar CRM
            </span>
            <i className="bi bi-chevron-right" />
            <strong>Workspace</strong>
          </div>

          <div className="crm-topbar-right">
            <span className="crm-topbar-status">
              <span />
              Workspace active
            </span>
            <ProfileMenu />
          </div>
        </header>

        <main className="crm-page-content">
          <Outlet />
        </main>

        <footer className="crm-footer">
          <span>© Rockstar CRM</span>
          <span>Built for better business management</span>
        </footer>
      </div>
    </div>
  );
}

export default MainLayout;
