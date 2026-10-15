import { useContext } from "react";
import { SidebarContext } from "./sidebar-context";

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within SidebarProvider");
  }

  return context;
}