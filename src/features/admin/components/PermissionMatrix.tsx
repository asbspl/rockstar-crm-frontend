import { useMemo, useState, type ChangeEvent, type RefCallback } from "react";
import type { AccessOption } from "../api/admin.api";
import ActionButton from "../../../components/common/ActionButton/ActionButton";
import "../styles/permission-matrix.css";

type PermissionItem = {
  permission: AccessOption;
  label: string;
};

type PermissionGroup = {
  module: string;
  permissions: PermissionItem[];
};

interface PermissionMatrixProps {
  permissions: AccessOption[];
  selectedPermissionIds: readonly number[];
  defaultPermissionIds?: readonly number[];
  onChange: (permissionIds: number[]) => void;
  onUpdated?: () => void;
  disabled?: boolean;
}

function getPermissionLabel(permission: AccessOption): string {
  return permission.name || permission.code || permission.key || `Permission ${permission.id}`;
}

function getPermissionDetails(permission: AccessOption): {
  module: string;
  label: string;
} {
  const label = getPermissionLabel(permission).trim();
  const module = permission.module?.trim();

  if (module) {
    const modulePrefix = `${module} `;
    return {
      module,
      label: label.toLowerCase().startsWith(modulePrefix.toLowerCase())
        ? label.slice(modulePrefix.length)
        : label,
    };
  }

  const separator = label.lastIndexOf(" ");
  if (separator > 0) {
    return {
      module: label.slice(0, separator),
      label: label.slice(separator + 1),
    };
  }

  return { module: "Uncategorized", label };
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
  label: string;
}) {
  const setIndeterminate: RefCallback<HTMLInputElement> = (element) => {
    if (element) element.indeterminate = indeterminate;
  };

  return (
    <input
      ref={setIndeterminate}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={onChange}
    />
  );
}

export default function PermissionMatrix({
  permissions,
  selectedPermissionIds,
  defaultPermissionIds = [],
  onChange,
  onUpdated,
  disabled = false,
}: PermissionMatrixProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const groups = useMemo<PermissionGroup[]>(() => {
    const grouped = new Map<string, PermissionItem[]>();

    const query = search.trim().toLowerCase();
    const filtered = permissions.filter((permission) => {
      const { module, label } = getPermissionDetails(permission);
      const active = permission.is_active !== false;
      if (filter === "active" && !active) return false;
      if (filter === "inactive" && active) return false;
      return !query || [
        module,
        label,
        permission.key,
        permission.code,
        permission.description,
      ].some((value) => String(value || "").toLowerCase().includes(query));
    });

    for (const permission of filtered) {
      const { module, label } = getPermissionDetails(permission);
      const modulePermissions = grouped.get(module) ?? [];
      modulePermissions.push({ permission, label });
      grouped.set(module, modulePermissions);
    }

    return [...grouped.entries()].map(([module, modulePermissions]) => ({
      module,
      permissions: modulePermissions,
    }));
  }, [permissions, search, filter]);

  const maxPermissionCount = Math.max(
    0,
    ...groups.map((group) => group.permissions.length),
  );

  const sourceKey = [...selectedPermissionIds].sort((a, b) => a - b).join(",");
  const [draftState, setDraftState] = useState<{
    source: string;
    ids: number[];
  } | null>(null);
  const draftIds = draftState?.source === sourceKey
    ? draftState.ids
    : [...selectedPermissionIds];
  const selectedIds = new Set(draftIds);
  const defaultIds = new Set(defaultPermissionIds);
  const allIds = [...new Set(
    groups.flatMap((group) =>
      group.permissions
        .filter(({ permission }) => permission.is_active !== false)
        .map(({ permission }) => Number(permission.id)),
    ),
  )];
  const selectedCount = allIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = allIds.length > 0 && selectedCount === allIds.length;
  const isDirty =
    draftIds.length !== selectedPermissionIds.length ||
    draftIds.some((id) => !selectedPermissionIds.includes(id));

function setPermissions(ids: number[], checked: boolean) {
  const next = new Set(selectedIds);

  for (const id of ids) {
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }

  const updatedIds = [...next];

  setDraftState({ source: sourceKey, ids: updatedIds });
  onChange(updatedIds);
}

function applyChanges() {
  onChange(draftIds);
  setDraftState(null);
  onUpdated?.();
}

  if (permissions.length === 0) {
    return (
      <div className="permission-matrix-empty">
        The backend did not return any supported permissions.
      </div>
    );
  }

  return (
    <div className="permission-matrix">
      <div className="permission-matrix__heading">
        <h3>Permissions by module</h3>
        <label className="permission-matrix__global">
          <IndeterminateCheckbox
            checked={allSelected}
            indeterminate={selectedCount > 0 && !allSelected}
            disabled={disabled}
            label="Select all module permissions"
            onChange={(event) => {
              if (!event.target.checked) {
                setDraftState({ source: sourceKey, ids: [] });
              } else {
                setPermissions(allIds, true);
              }
            }}
          />
        </label>
      </div>

      <div className="permission-matrix__filters">
        <label>
          <span className="sr-only">Search permissions</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search modules or permissions"
          />
        </label>
        <select
          aria-label="Filter permissions by status"
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as "all" | "active" | "inactive")
          }
        >
          <option value="all">All permissions</option>
          <option value="active">Active definitions</option>
          <option value="inactive">Inactive definitions</option>
        </select>
        <div className="permission-matrix__legend">
          {/* <span className="permission-matrix__badge permission-matrix__badge--default">Role default</span> */}
          {/* <span className="permission-matrix__badge permission-matrix__badge--custom">Customized</span> */}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="permission-matrix-empty">
          No permissions match the current search or filter.
        </div>
      ) : (
      <div className="permission-matrix__scroll">
        <table
          className="permission-matrix__table"
          style={{
            minWidth: `max(100%, ${(maxPermissionCount + 2) * 135}px)`,
          }}
        >
          <tbody>
            {groups.map(({ module, permissions: modulePermissions }) => {
              const moduleIds = modulePermissions
                .filter(({ permission }) => permission.is_active !== false)
                .map(({ permission }) => Number(permission.id));
              const selectedModuleCount = moduleIds.filter((id) =>
                selectedIds.has(id),
              ).length;
              const moduleEnabled = selectedModuleCount > 0;
              const moduleSelected =
                moduleIds.length > 0 &&
                selectedModuleCount === moduleIds.length;

              return (
                <tr key={module}>
                  <td>
                    <IndeterminateCheckbox
                      checked={moduleSelected}
                      indeterminate={
                        selectedModuleCount > 0 && !moduleSelected
                      }
                      disabled={disabled || moduleIds.length === 0}
                      label={`Select all ${module} permissions`}
                      onChange={(event) =>
                        setPermissions(moduleIds, event.target.checked)
                      }
                    />
                    <span>All</span>
                  </td>
                  <td>
                    <label className="permission-matrix__module">
                      <input
                        type="checkbox"
                        checked={moduleEnabled}
                        disabled={disabled || moduleIds.length === 0}
                        aria-label={`Enable ${module} module access`}
                        onChange={(event) =>
                          setPermissions(
                            moduleIds,
                            event.target.checked,
                          )
                        }
                      />
                      <span>{module}</span>
                    </label>
                  </td>
                  {modulePermissions.map(({ permission, label }) => (
                    <td
                      key={permission.id}
                      className={permission.is_active === false ? "is-inactive" : ""}
                    >
                      <label className="permission-matrix__permission">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(Number(permission.id))}
                          disabled={disabled || permission.is_active === false}
                          aria-label={`${module}: ${label}${permission.code ? ` (${permission.code})` : ""}`}
                          title={
                            permission.description ??
                            permission.code ??
                            undefined
                          }
                          onChange={(event) =>
                            setPermissions(
                              [Number(permission.id)],
                              event.target.checked,
                            )
                          }
                        />
                        <span>{label}</span>
                        <span
                          className={`permission-matrix__badge ${
                            defaultIds.has(Number(permission.id))
                              ? selectedIds.has(Number(permission.id))
                                ? "permission-matrix__badge--default"
                                : "permission-matrix__badge--deny"
                              : selectedIds.has(Number(permission.id))
                                ? "permission-matrix__badge--custom"
                                : "permission-matrix__badge--none"
                          }`}
                        >
                          {defaultIds.has(Number(permission.id))
                            ? selectedIds.has(Number(permission.id))
                              ? "Role default"
                              : "Custom deny"
                            : selectedIds.has(Number(permission.id))
                              ? "Custom grant"
                              : "—"}
                        </span>
                      </label>
                    </td>
                  ))}
                  {Array.from({ length: maxPermissionCount - modulePermissions.length }, (_, index) => (
                    <td key={`empty-${index}`} />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
      <div className="permission-matrix__actions">
        <ActionButton
          action="update"
          className="permission-matrix__update"
          onClick={applyChanges}
          disabled={disabled || !isDirty}
        >
          Update
        </ActionButton>
      </div>
    </div>
  );
}
