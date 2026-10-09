import { createContext, useContext, useSyncExternalStore } from "react";
import { IdeController, DEMOS, type IdeSnapshot } from "@/lib/vv/controller";

const INITIAL_SNAPSHOT: IdeSnapshot = {
  booted: false,
  kernelReady: false,
  bootPhase: "init",
  bootDone: 0,
  bootTotal: 0,
  bootError: null,
  runPhase: null,
  view: "home",
  shareLoading: false,
  shareMessage: "",
  importRemoteOpen: false,
  projectTitle: null,
  workspaceFolders: [],
  activeFolderId: null,
  recentProjects: [],
  treeVersion: 0,
  files: [],
  openTabs: [],
  activeTab: null,
  tabKinds: {},
  previewTab: null,
  dirty: [],
  terminals: [],
  activeTermId: null,
  ports: [],
  previewTabs: [],
  activePreviewId: null,
  devtoolsOpen: false,
  devtoolsNonce: 0,
  selectedDemo: DEMOS[0].id,
  activeView: "explorer",
  sidebarCollapsed: false,
  panelCollapsed: true,
  previewCollapsed: false,
  wordWrap: false,
  panelTab: "console",
  clipboard: null,
  paletteOpen: false,
  paletteMode: "command",
  problems: { errors: 0, warnings: 0 },
  memInfo: null,
};

// One kernel worker per page → one controller. A module-level singleton keeps
// React StrictMode's double-mount from spawning a second kernel worker.
let singleton: IdeController | null = null;

export function getController(): IdeController | null {
  if (typeof window === "undefined") return null;
  return (singleton ??= new IdeController());
}

export const IdeContext = createContext<IdeController | null>(null);

export function useController(): IdeController | null {
  return useContext(IdeContext) ?? getController();
}

/** Subscribe to the controller's immutable UI snapshot. */
export function useIde(): { c: IdeController; snap: IdeSnapshot } {
  const c = useController();
  const snap = useSyncExternalStore(
    c ? c.subscribe : () => () => {},
    c ? c.getSnapshot : () => INITIAL_SNAPSHOT,
    c ? c.getSnapshot : () => INITIAL_SNAPSHOT
  );
  return { c: c!, snap };
}
