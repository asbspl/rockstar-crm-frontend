import { createContext } from "react";

type SidebarContextValue = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

export const SidebarContext = createContext<SidebarContextValue | null>(null);