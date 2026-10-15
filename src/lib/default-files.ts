import { newTempId, type TreeNode } from './playground-tree'

const HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Playground</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main id="app">
      <h1>Hello, Playground!</h1>
      <p>Edit the HTML, CSS and JavaScript files — the preview updates as you type.</p>
    </main>
    <script src="script.js"></script>
  </body>
</html>
`

const CSS = `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #f8fafc;
}

#app {
  padding: 2rem 2.5rem;
  border-radius: 12px;
  background: #1e293b;
  text-align: center;
}
`

const JS = `console.log('Welcome to the Playground!')
`

/** Naye playground ki starter files (client temp ids ke saath) */
export function createDefaultNodes(): TreeNode[] {
  return [
    { id: newTempId(), parentId: null, name: 'index.html', type: 'file', content: HTML },
    { id: newTempId(), parentId: null, name: 'styles.css', type: 'file', content: CSS },
    { id: newTempId(), parentId: null, name: 'script.js', type: 'file', content: JS },
  ]
}
