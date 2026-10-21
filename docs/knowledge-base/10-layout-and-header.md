# 10. Layout, header and board page

> Status: target design. Built in Iteration 1 (shell) and Iteration 3 (canvas). The Theory / Editor / Both tabs, the primary bar and the editor tab are removed.

## Header
- Left: product name + the board title (an input for the owner: English characters, spaces become hyphens, max 50; plain text for everyone else).
- Right (owner): unsaved indicator, Save, Share (toggle + copy link), theme toggle, user menu (My boards, New board, Logout).
- Right (signed-in non-owner): "View only" badge + theme toggle + user menu. Right (signed out): theme toggle + Sign in button that opens the modal (Sign in / Register tabs).
- Compact, one row, works on mobile.

## Pages
- `/`: signed out = short intro + Sign in / Register; signed in = "My boards" list + New board.
- `/b/<slug>`: the board. Header on top, the canvas fills the rest of the screen. Zoom controls (zoom out, percentage, zoom in, fit, reset) in a small floating bar at the bottom.

## Theme
Light is the default; the toggle switches light/dark, is stored in the browser and applied before first paint. The canvas background, grid and text follow the theme. The Payload admin panel is not affected.

## Visitors
Visitors (signed out or not the owner) see a shared board read-only: pan and zoom only. Private boards return 404 for them.
