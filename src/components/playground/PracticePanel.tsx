'use client'

import {
  SandpackConsole,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react'
import Editor from '@monaco-editor/react'
import { Eye, FileCode, Plus, Terminal, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

export interface PlaygroundFile {
  id?: string | number
  path: string
  content: string
}

interface PracticePanelProps {
  files?: PlaygroundFile[]
  isReadOnly?: boolean
  onFilesChange?: (files: PlaygroundFile[]) => void
}

const DEFAULT_FILES: Record<string, string> = {
  '/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="styles.css" />
    <title>Playground</title>
  </head>
  <body>
    <div id="app">
      <h1>Hello Playground!</h1>
      <p>Edit HTML, CSS, and JS to see changes live.</p>
    </div>
    <script src="script.js"></script>
  </body>
</html>`,
  '/styles.css': `body {
  font-family: system-ui, sans-serif;
  background-color: #0f172a;
  color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}

#app {
  text-align: center;
  padding: 2rem;
  border-radius: 8px;
  background: #1e293b;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}`,
  '/script.js': `console.log('Welcome to Playground!');
`,
}

function MonacoWrapper({
  activeFile,
  isReadOnly,
  onFileChange,
}: {
  activeFile: string
  isReadOnly: boolean
  onFileChange?: (path: string, content: string) => void
}) {
  const { sandpack } = useSandpack()
  const currentContent = sandpack.files[activeFile]?.code || ''

  const getLanguage = (filePath: string) => {
    if (filePath.endsWith('.html')) return 'html'
    if (filePath.endsWith('.css')) return 'css'
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript'
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript'
    if (filePath.endsWith('.json')) return 'json'
    return 'plaintext'
  }

  const handleEditorChange = (value: string | undefined) => {
    const val = value ?? ''
    sandpack.updateFile(activeFile, val)
    if (onFileChange) {
      onFileChange(activeFile, val)
    }
  }

  return (
    <Editor
      height="100%"
      language={getLanguage(activeFile)}
      theme="vs-dark"
      value={currentContent}
      onChange={handleEditorChange}
      options={{
        readOnly: isReadOnly,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  )
}

export default function PracticePanel({
  files,
  isReadOnly = false,
  onFilesChange,
}: PracticePanelProps) {
  const initialSandpackFiles = React.useMemo(() => {
    if (!files || files.length === 0) return DEFAULT_FILES
    const map: Record<string, string> = {}
    for (const f of files) {
      const normalizedPath = f.path.startsWith('/') ? f.path : `/${f.path}`
      map[normalizedPath] = f.content
    }
    return map
  }, [files])

  const [activeFile, setActiveFile] = useState<string>('/index.html')
  const [newFileName, setNewFileName] = useState('')
  const [isAddingFile, setIsAddingFile] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'console'>('preview')
  const [sandpackFiles, setSandpackFiles] = useState<Record<string, string>>(initialSandpackFiles)

  React.useEffect(() => {
    setSandpackFiles(initialSandpackFiles)
    const fileKeys = Object.keys(initialSandpackFiles)
    if (fileKeys.length > 0 && !initialSandpackFiles[activeFile]) {
      setActiveFile(fileKeys[0])
    }
  }, [initialSandpackFiles, activeFile])

  const handleFileChange = (path: string, content: string) => {
    const updated = { ...sandpackFiles, [path]: content }
    setSandpackFiles(updated)
    if (onFilesChange) {
      onFilesChange(
        Object.entries(updated).map(([p, c]) => ({
          path: p.startsWith('/') ? p.slice(1) : p,
          content: c,
        })),
      )
    }
  }

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFileName.trim()) return
    let path = newFileName.trim()
    if (!path.startsWith('/')) path = `/${path}`

    if (sandpackFiles[path]) return

    const updated = { ...sandpackFiles, [path]: '' }
    setSandpackFiles(updated)
    setActiveFile(path)
    setNewFileName('')
    setIsAddingFile(false)

    if (onFilesChange) {
      onFilesChange(
        Object.entries(updated).map(([p, c]) => ({
          path: p.startsWith('/') ? p.slice(1) : p,
          content: c,
        })),
      )
    }
  }

  const handleDeleteFile = (pathToDelete: string) => {
    if (isReadOnly) return
    const keys = Object.keys(sandpackFiles)
    if (keys.length <= 1) return // Keep at least 1 file

    const updated = { ...sandpackFiles }
    delete updated[pathToDelete]
    setSandpackFiles(updated)

    if (activeFile === pathToDelete) {
      const remainingKeys = Object.keys(updated)
      setActiveFile(remainingKeys[0] || '/index.html')
    }

    if (onFilesChange) {
      onFilesChange(
        Object.entries(updated).map(([p, c]) => ({
          path: p.startsWith('/') ? p.slice(1) : p,
          content: c,
        })),
      )
    }
  }

  return (
    <SandpackProvider
      template="static"
      files={sandpackFiles}
      theme="dark"
      options={{
        recompileMode: 'immediate',
        recompileDelay: 300,
      }}
    >
      <div className="flex h-full w-full flex-col bg-background">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Left: Code Editor & Files */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex h-full flex-col border-r">
              {/* File Explorer Bar */}
              <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 overflow-x-auto">
                <div className="flex items-center gap-1">
                  {Object.keys(sandpackFiles).map((filePath) => (
                    <button
                      type="button"
                      key={filePath}
                      className={`group flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                        activeFile === filePath
                          ? 'bg-accent text-accent-foreground font-semibold'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      }`}
                      onClick={() => setActiveFile(filePath)}
                    >
                      <FileCode className="h-3.5 w-3.5" />
                      <span>{filePath.replace(/^\//, '')}</span>
                      {!isReadOnly && Object.keys(sandpackFiles).length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFile(filePath)
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>

                {!isReadOnly && (
                  <div>
                    {isAddingFile ? (
                      <form onSubmit={handleCreateFile} className="flex items-center gap-1">
                        <Input
                          type="text"
                          placeholder="file.js"
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          className="h-6 w-28 text-xs px-1.5"
                          autoFocus
                        />
                        <Button
                          type="submit"
                          size="xs"
                          variant="ghost"
                          className="h-6 px-1 text-xs"
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => setIsAddingFile(false)}
                          className="h-6 px-1 text-xs text-muted-foreground"
                        >
                          ✕
                        </Button>
                      </form>
                    ) : (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setIsAddingFile(true)}
                        className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        File
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 bg-[#1e1e1e]">
                <MonacoWrapper
                  activeFile={activeFile}
                  isReadOnly={isReadOnly}
                  onFileChange={handleFileChange}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right: Live Preview & Console */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex h-full flex-col">
              {/* Tab Bar */}
              <div className="flex items-center border-b bg-muted/40 px-3 py-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium ${
                    activeTab === 'preview'
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('console')}
                  className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium ${
                    activeTab === 'console'
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  Console
                </button>
              </div>

              {/* Preview or Console Area */}
              <div className="flex-1 bg-white relative">
                {activeTab === 'preview' ? (
                  <SandpackPreview
                    showOpenInCodeSandbox={false}
                    showRefreshButton={true}
                    style={{ height: '100%', width: '100%' }}
                  />
                ) : (
                  <div className="h-full w-full bg-[#18181b] text-white">
                    <SandpackConsole style={{ height: '100%', width: '100%' }} />
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </SandpackProvider>
  )
}
