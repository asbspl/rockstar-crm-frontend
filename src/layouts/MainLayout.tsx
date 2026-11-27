
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "../contexts/useAuthContext";
import {
  getModulePermission,
  getRouteReadPermissions,
} from "../config/permissions";
import ProfileMenu from "../features/auth/components/ProfileMenu.tsx";
import "./main-layout.css";

type MenuItem = {
  label: string;
  path: string;
  icon: string;
};

type NavigationItem =
  | {
      label: string;
      path: string;
      icon: string;
      type: "link";
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
  },
{
  label: "CRM Blueprint",
  path: "/crm-blueprint",
  icon: "bi-diagram-3",
  type: "link",
},
  {
    label: "Settings",
    icon: "bi-sliders",
    type: "menu",
    items: [
      {
        label: "Manage Company",
        path: "/settings/companies",
        icon: "bi-buildings",
      },
      {
        label: "Manage Employee",
        path: "/settings/employees",
        icon: "bi-person-badge",
      },
      {
        label: "Manage Driver",
        path: "/settings/drivers",
        icon: "bi-truck-front",
      },
      {
        label: "Manage Contractor",
        path: "/settings/contractors",
        icon: "bi-people-fill",
      },
      // {
      //   label: "Manage State",
      //   path: "/settings/states",
      //   icon: "bi-map",
      // },
      // {
      //   label: "Manage City",
      //   path: "/settings/cities",
      //   icon: "bi-buildings-fill",
      // },
    ],
  },
  {
    label: "Customers",
    icon: "bi-people",
    type: "menu",
    items: [
      {
        label: "Manage Client",
        path: "/customers/clients",
        icon: "bi-person-lines-fill",
      },
      {
        label: "Manage Customer",
        path: "/customers/customers",
        icon: "bi-person-heart",
      },
      {
        label: "Manage Location",
        path: "/customers/locations",
        icon: "bi-geo-alt",
      },
      {
        label: "Manage Site",
        path: "/customers/sites",
        icon: "bi-pin-map",
      },
      {
        label: "Manage Quotation",
        path: "/customers/quotations",
        icon: "bi-file-earmark-text",
      },
      {
        label: "Manage Order",
        path: "/customers/orders",
        icon: "bi-bag-check",
      },
      // {
      //   label: "Manage Visit",
      //   path: "/customers/visits",
      //   icon: "bi-calendar2-week",
      // },
      // {
      //   label: "Manage Queries",
      //   path: "/customers/queries",
      //   icon: "bi-chat-square-dots",
      // },
    ],
  },
  {
    label: "Product",
    icon: "bi-box-seam",
    type: "menu",
    items: [
      {
        label: "Manage Product",
        path: "/products/products",
        icon: "bi-boxes",
      },
      {
        label: "Manage Rate Matrix",
        path: "/products/rate-matrix",
        icon: "bi-calculator",
      },
      // {
      //   label: "Manage Coupon",
      //   path: "/settings/coupons",
      //   icon: "bi-ticket-perforated",
      // },
    ],
  },
  {
    label: "User Management",
    path: "/admin/users",
    icon: "bi-people",
    type: "link",
  },
  {
    label: "Access Management",
    path: "/admin/access",
    icon: "bi-shield-lock",
    type: "link",
  },
  {
    label: "Registration Requests",
    path: "/admin/registrations",
    icon: "bi-person-vcard",
    type: "link",
  },
  // {
  //   label: "Applications",
  //   path: "/admin/applications",
  //   icon: "bi-clipboard2-check",
  //   type: "link",
  // },
  {
    label: "User Activity",
    path: "/admin/user-activity",
    icon: "bi-activity",
    type: "link",
  },
];

function isRouteActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function MainLayout() {
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { user, roles, hasPermission } = useAuthContext();

  const isAdmin = roles.some((role) =>
    ["admin", "super_admin"].includes(role.trim().toLowerCase()),
  );

  const displayName =
    user?.full_name ?? user?.name ?? user?.email ?? "User";

  const avatar = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  // Find the parent menu containing the current route.
  const activeMenu = navigation.find((item) => {
    if (item.type !== "menu") return false;

    return item.items.some((subItem) =>
      isRouteActive(location.pathname, subItem.path),
    );
  });

  const activeMenuLabel =
    activeMenu?.type === "menu" ? activeMenu.label : null;

  // Automatically expand the active parent in expanded mode.
  // Keep all submenus closed when the sidebar is collapsed.
  useEffect(() => {
    if (sidebarCollapsed) {
      setExpanded(null);
    } else {
      setExpanded(activeMenuLabel);
    }
  }, [location.pathname, sidebarCollapsed, activeMenuLabel]);

  const closeSidebar = () => {
    setMenuOpen(false);
  };

  const handleNavigation = () => {
    closeSidebar();
    setExpanded(null);
  };

  const toggleMenu = (label: string) => {
    setExpanded((current) => (current === label ? null : label));
  };

  // Collapse or expand the desktop sidebar.
  const toggleSidebar = () => {
    const next = !sidebarCollapsed;

    setSidebarCollapsed(next);
    setExpanded(next ? null : activeMenuLabel);
  };

  return (
    <div
      className={`crm-layout ${
        menuOpen ? "crm-mobile-menu-open" : ""
      } ${sidebarCollapsed ? "crm-sidebar-collapsed" : ""}`}
    >
      {/* Mobile backdrop */}
      {menuOpen && (
        <button
          type="button"
          className="crm-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`crm-sidebar ${
          menuOpen ? "crm-sidebar-open" : ""
        }`}
      >
        {/* Brand and collapse button */}
        <div className="crm-brand-row">
          <Link
            to="/dashboard"
            className="crm-brand"
            onClick={handleNavigation}
            title="ROCKSTAR CRM"
          >
<span className="crm-brand-icon">
    <img
        src="/s-rockstar-logo.png"
        alt="Rockstar Logo"
        className="crm-brand-logo"
    />
</span>

            <span className="crm-brand-text">
              <strong>ROCKSTAR</strong>
              <small>CRM PLATFORM</small>
            </span>
          </Link>

          <button
            type="button"
            className="crm-sidebar-collapse-toggle"
            onClick={toggleSidebar}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            title={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            <i
              className={`bi ${
                sidebarCollapsed
                  ? "bi-chevron-right"
                  : "bi-chevron-left"
              }`}
            />
          </button>
        </div>

        <div className="crm-workspace-label">WORKSPACE</div>

        {/* Navigation */}
        <nav className="crm-navigation" aria-label="Main navigation">
          {navigation.map((item) => {
            // Normal navigation links
            if (item.type === "link") {
              const requiredPermissions =
                getRouteReadPermissions(item.path);

              if (
                requiredPermissions.length === 0 ||
                !requiredPermissions.every(hasPermission)
              ) {
                return null;
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  title={sidebarCollapsed ? item.label : undefined}
                  onClick={handleNavigation}
                  className={({ isActive }) =>
                    `crm-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <i className={`bi ${item.icon}`} />
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            // Filter submenu items according to read permissions.
            const visibleItems = item.items.filter((subItem) => {
              const permission = getModulePermission(
                subItem.path,
                "read",
              );

              return Boolean(permission && hasPermission(permission));
            });

            if (visibleItems.length === 0) return null;

            // Check whether this menu contains the active route.
            const isActiveMenu = visibleItems.some((subItem) =>
              isRouteActive(location.pathname, subItem.path),
            );

            // Expanded sidebar automatically opens active parent.
            // Collapsed sidebar opens submenu only when clicked.
            const isOpen = sidebarCollapsed
              ? expanded === item.label
              : expanded === item.label || isActiveMenu;

            return (
              <section
                className={`crm-menu-section ${
                  isActiveMenu ? "has-active-route" : ""
                } ${isOpen ? "is-open" : ""}`}
                key={item.label}
              >
                <button
                  type="button"
                  className={`crm-menu-heading ${
                    isActiveMenu ? "active" : ""
                  }`}
                  onClick={() => toggleMenu(item.label)}
                  aria-expanded={isOpen}
                  title={sidebarCollapsed ? item.label : undefined}
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

                {/* Submenu */}
                {isOpen && (
                  <div className="crm-submenu">
                    {visibleItems.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        end
                        title={
                          sidebarCollapsed ? subItem.label : undefined
                        }
                        aria-label={subItem.label}
                        onClick={handleNavigation}
                        className={({ isActive }) =>
                          `crm-submenu-link ${
                            !sidebarCollapsed && isActive ? "active" : ""
                          }`
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

        {/* Help section */}
        <div className="crm-sidebar-help">
          <span className="crm-help-icon">
            <i className="bi bi-lightbulb" />
          </span>

          <div>
            <strong>Need a hand?</strong>
            <small>You're doing great!</small>
          </div>
        </div>

        {/* User footer */}
        <div className="crm-sidebar-footer">
          <div className="crm-user-avatar">{avatar || "U"}</div>

          <div className="crm-user-info">
            <strong>{displayName}</strong>
            <small>
              {isAdmin
                ? "Workspace admin"
                : user?.email ?? "CRM user"}
            </small>
          </div>

          {isAdmin && (
            <i className="bi bi-shield-check crm-admin-shield" />
          )}
        </div>
      </aside>

      {/* Main content */}
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
