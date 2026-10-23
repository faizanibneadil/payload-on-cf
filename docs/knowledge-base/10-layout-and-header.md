# 10. Layout, header and board page

> Status: header and pages built in Iterations 1-2. The board page body changes from the canvas to the editor in task A3.

## Header
- Left: product name + the board title (an input for the owner: free text, max 50 characters, must contain at least one letter or digit; plain text for everyone else).
- Right (owner): Share (popover: switch + link + Copy, Copy only while shared), Save (disabled when nothing changed, Ctrl/Cmd+S), theme toggle, user menu (My boards, New board, Sign out). An amber dot + "Unsaved changes" sits next to the title input.
- Unsaved changes: browser reload/close shows the native warning; the logo and user menu items ask for confirmation first (`components/shell/leave-guard.ts`).
- On mobile the username is hidden in the header (icon only) so the title has room.
- Right (signed-in non-owner): "View only" badge + theme toggle + user menu. Right (signed out): theme toggle + Sign in button that opens the modal (Sign in / Register tabs).
- Compact, one row, works on mobile.

## Pages
- `/`: signed out = short intro + Sign in / Register; signed in = "My boards" list + New board.
- `/b/<slug>`: the board. Header on top, the document (editor for the owner, read view for others) below it, scrolling normally.

## Theme
Light is the default; the toggle switches light/dark, is stored in the browser and applied before first paint. The editor and read view follow the theme. The Payload admin panel is not affected.

## Visitors
Visitors (signed out or not the owner) see a shared board read-only (links can be clicked). Private boards return 404 for them.
