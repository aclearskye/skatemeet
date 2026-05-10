import { createContext, ReactNode, useContext, useState } from "react";

type DrawerContextType = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextType>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const DrawerProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DrawerContext.Provider
      value={{
        isOpen,
        openDrawer: () => setIsOpen(true),
        closeDrawer: () => setIsOpen(false),
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
};

export const useDrawer = () => useContext(DrawerContext);
