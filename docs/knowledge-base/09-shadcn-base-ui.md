# 09. shadcn/ui on Base UI

Docs:
- shadcn CLI: https://ui.shadcn.com/docs/cli
- shadcn installation (Next.js): https://ui.shadcn.com/docs/installation/next
- Base UI: https://base-ui.com

## Setup
```bash
pnpm dlx shadcn@latest init --preset b0
```
Run non-interactively where possible (see `pnpm dlx shadcn@latest init --help`). Add components with `pnpm dlx shadcn@latest add <name>`.

## Tailwind v4 packages required by the brief
`tailwindcss@^4`, `@tailwindcss/postcss@^4`, `tw-animate-css@^1.4.0`. Do **not** install the npm package `cn`; shadcn generates `cn()` in `lib/utils.ts` using `clsx` + `tailwind-merge`.

## Must be Base UI, not Radix
After init and after every `add`, verify. Search the repo:
- Allowed: imports from the Base UI package (`@base-ui/react/...`; older name `@base-ui-components/react`). **[Verify the current package name from generated files]**
- Forbidden: `radix-ui`, `@radix-ui/*`. If present, re-add that component with the Base UI variant or replace it.
- Check `components.json` and the generated `components/ui/*`.

## Base UI differences vs Radix (watch for these)
- Polymorphism uses the **`render` prop** instead of Radix's `asChild`. **[Verify per component]**
- Part names differ slightly (e.g. Trigger/Popup/Positioner structure for popovers and menus). Follow the generated component code and Base UI docs instead of Radix habits.
- Prefer the generated shadcn wrappers over importing Base UI primitives directly in app code.

## Components likely needed
Button, Tabs, Input, Tooltip, Toggle/ToggleGroup (theme), Dropdown/Menu, Dialog or AlertDialog (fork confirm, unsaved changes), Sonner/Toast (save feedback), Skeleton, ScrollArea, Resizable panels (file/code/preview layout) **[Verify availability on Base UI variant]**.

## Theme (light/dark) without flash
Use `next-themes` (or an inline script setting a class before hydration), icon-only toggle, persisted preference. Tailwind v4 dark variant via the `dark` class.

## UI performance
Server Components by default. Mark only interactive pieces `"use client"`. Do not wrap the whole layout in a client component. Lazy-load editors/Vivari.
