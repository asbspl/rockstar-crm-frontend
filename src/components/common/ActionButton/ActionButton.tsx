import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./ActionButton.css"

type ActionType = "add" | "edit" | "delete" | "update" | "cancel";

interface ActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  action: ActionType;
  children?: ReactNode;
}

const actionDefaults: Record<
  ActionType,
  { label: string; icon?: string; title: string }
> = {
  add: { label: "Add", icon: "bi bi-plus-lg", title: "Add" },
  edit: {
    label: "Edit",
    icon: "bi bi-pencil-square",
    title: "Edit",
  },
  delete: { label: "Delete", icon: "bi bi-trash", title: "Delete" },
  update: { label: "Update", icon: "bi bi-check-lg", title: "Update" },
  cancel: { label: "Cancel", icon: "bi bi-x-lg", title: "Cancel" },
};

export default function ActionButton({
  action,
  children,
  className = "",
  title,
  type = "button",
  ...props
}: ActionButtonProps) {
  const config = actionDefaults[action];

  return (
    <button
      type={type}
      className={`action-button action-button--${action} ${className}`.trim()}
      title={title ?? config.title}
      {...props}
    >
      {config.icon && <i className={config.icon} aria-hidden="true" />}
      {children ?? config.label}
    </button>
  );
}