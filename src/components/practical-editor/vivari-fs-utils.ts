export interface FileNode {
  file: {
    contents: string
  }
}

export interface DirectoryNode {
  directory: {
    [key: string]: FileNode | DirectoryNode
  }
}

export type FileSystemTree = {
  [key: string]: FileNode | DirectoryNode
}

export const DEFAULT_PLAYGROUND_FILES: FileSystemTree = {
  'index.html': {
    file: {
      contents: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Playground</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <h1>Hello World!</h1>
    <p>Edit HTML, CSS, or JS in the editor to see live updates!</p>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    },
  },
  'styles.css': {
    file: {
      contents: `body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 2rem;
  background-color: #0f172a;
  color: #f8fafc;
}

#app {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

h1 {
  color: #38bdf8;
}`,
    },
  },
  'script.js': {
    file: {
      contents: `console.log("Code Playground initialized.");`,
    },
  },
}

export const MAX_FILE_COUNT = 50
export const MAX_TOTAL_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export function flattenTree(tree: FileSystemTree, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, node] of Object.entries(tree)) {
    const fullPath = prefix ? `${prefix}/${key}` : key
    if ('file' in node && node.file) {
      result[fullPath] = node.file.contents
    } else if ('directory' in node && node.directory) {
      Object.assign(result, flattenTree(node.directory, fullPath))
    }
  }
  return result
}

export function unflattenTree(filesMap: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {}
  for (const [path, contents] of Object.entries(filesMap)) {
    const parts = path.split('/')
    let current = tree
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (i === parts.length - 1) {
        current[part] = { file: { contents } }
      } else {
        if (!current[part] || !('directory' in current[part])) {
          current[part] = { directory: {} }
        }
        current = (current[part] as DirectoryNode).directory
      }
    }
  }
  return tree
}
