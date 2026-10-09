import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TitleBar, TitleBarProps } from "./TitleBar";
import { ActivityBar } from "./ActivityBar";
import { Explorer } from "./Explorer";
import { SearchPane } from "./SearchPane";
import { DebugPanel } from "./DebugPanel";
import { SourceControlPanel } from "./SourceControlPanel";
import { TheoryPanel } from "./TheoryPanel";
import { EditorGroup } from "./EditorGroup";
import { TerminalPanel } from "./TerminalPanel";
import { PreviewPanel } from "./PreviewPanel";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "./CommandPalette";
import { HomeView } from "./Home";
import { ImportRemoteDialog } from "./ImportRemoteDialog";
import { useIde } from "./useIde";
import { isWordWrapChord } from "@/lib/vv/editor-prefs";

export interface AppShellProps extends TitleBarProps {
  initialFiles?: Array<{ path: string; content: string }>
  theoryContent?: any
}

export function AppShell({ playground, initialFiles, currentUser, theoryContent }: AppShellProps) {
  const { c, snap } = useIde();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme === "light" || resolvedTheme === "dark") {
      c.applyUiTheme(resolvedTheme);
    }
  }, [c, resolvedTheme]);

  useEffect(() => {
    if (!initialFiles || initialFiles.length === 0 || !snap.kernelReady || !playground) return;
    const projName = playground.slug || playground.title || "playground";
    const dir = `/projects/${projName}`;
    void c.importFilesAsProject({
      name: playground.title || projName,
      dir,
      files: initialFiles,
      silent: true,
    });
  }, [c, snap.kernelReady, playground, initialFiles]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isWordWrapChord(e)) {
        if (document.activeElement?.closest(".vv-term-host")) return;
        e.preventDefault();
        c.toggleWordWrap();
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (e.shiftKey && k === "e") {
        e.preventDefault();
        c.setActiveView("explorer");
      } else if (e.shiftKey && k === "f") {
        e.preventDefault();
        c.setActiveView("search");
      } else if (e.shiftKey && k === "g") {
        e.preventDefault();
        c.setActiveView("scm");
      } else if (e.shiftKey && k === "t") {
        e.preventDefault();
        c.setActiveView("theory" as any);
      } else if (e.shiftKey && k === "p") {
        e.preventDefault();
        c.openPalette("command");
      } else if (k === "p") {
        e.preventDefault();
        c.openPalette("file");
      } else if (k === "`") {
        e.preventDefault();
        c.togglePanel();
      } else if (e.altKey && (k === "b" || e.code === "KeyB")) {
        e.preventDefault();
        c.togglePreview();
      } else if (k === "b") {
        e.preventDefault();
        c.toggleSidebar();
      } else if (k === "j") {
        e.preventDefault();
        c.togglePanel();
      } else if (k === "s") {
        if (document.activeElement?.closest(".monaco-editor")) {
          e.preventDefault();
          c.saveActiveFile();
        }
      } else if (e.shiftKey && k === "c") {
        e.preventDefault();
        c.newShellTerminal();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [c]);

  useEffect(() => {
    const shouldWarn = snap.projectTitle != null || snap.dirty.length > 0;
    if (!shouldWarn) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    addEventListener("beforeunload", onBeforeUnload);
    return () => removeEventListener("beforeunload", onBeforeUnload);
  }, [snap.projectTitle, snap.dirty.length]);

  const isOwner = Boolean(
    playground &&
      currentUser &&
      (currentUser.role === "admin" ||
        (typeof playground.owner === "object"
          ? playground.owner.id === currentUser.id
          : playground.owner === currentUser.id))
  );

  const isTheoryView = snap.activeView === ("theory" as any);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden text-foreground">
      <TitleBar playground={playground} currentUser={currentUser} />
      <div className="flex min-h-0 flex-1">
        <ActivityBar />
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          {!snap.sidebarCollapsed && (
            <>
              <ResizablePanel
                id={isTheoryView ? "theory-sidebar" : "explorer"}
                defaultSize={isTheoryView ? 32 : 16}
                minSize={isTheoryView ? 18 : 10}
                maxSize={isTheoryView ? 70 : 30}
              >
                {isTheoryView ? (
                  <TheoryPanel
                    playgroundId={playground?.id}
                    initialContent={theoryContent}
                    isOwner={isOwner}
                  />
                ) : snap.activeView === "search" ? (
                  <SearchPane />
                ) : snap.activeView === "debug" ? (
                  <DebugPanel />
                ) : snap.activeView === "scm" ? (
                  <SourceControlPanel />
                ) : (
                  <Explorer />
                )}
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}
          <ResizablePanel id="center" defaultSize="52%" minSize="25%">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel id="editor" defaultSize="65%" minSize="20%">
                <EditorGroup />
              </ResizablePanel>
              {!snap.panelCollapsed && (
                <>
                  <ResizableHandle />
                  <ResizablePanel id="terminal" defaultSize="35%" minSize="10%">
                    <TerminalPanel />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>
          {!snap.previewCollapsed && (
            <>
              <ResizableHandle />
              <ResizablePanel id="preview" defaultSize="32%">
                <PreviewPanel />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
      <StatusBar />
      <CommandPalette />
      <ImportRemoteDialog />
      {snap.view === "home" && <HomeView />}
    </div>
  );
}
