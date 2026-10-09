import { useEffect, useState, type ReactNode } from "react";
import { IdeContext, getController } from "./useIde";
import type { IdeController } from "@/lib/vv/controller";

export function IdeProvider({ children }: { children: ReactNode }) {
  const [controller, setController] = useState<IdeController | null>(() => getController());

  useEffect(() => {
    let instance = controller;
    if (!instance) {
      instance = getController();
      if (instance) setController(instance);
    }
    if (instance) {
      instance.start();
      // Dev-only handle for debugging + headless parity tests.
      if (import.meta.env.DEV) (window as unknown as { __ide: unknown }).__ide = instance;
    }
  }, [controller]);

  return <IdeContext.Provider value={controller}>{children}</IdeContext.Provider>;
}
