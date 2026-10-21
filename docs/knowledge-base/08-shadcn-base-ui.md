# 09. shadcn/ui on Base UI

Docs:
- shadcn CLI: https://ui.shadcn.com/docs/cli
- shadcn installation (Next.js): https://ui.shadcn.com/docs/installation/next
- Base UI: https://base-ui.com

## Setup
shadcn is already initialised (`components.json`, Base UI variant). Iteration 1 applies the preset `b5rR41Mtnc` (check `pnpm dlx shadcn@latest init --help` for the current preset flag) and must keep the Base UI variant. Add components with `pnpm dlx shadcn@latest add <name>`.

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
Button, Input, Tooltip, Toggle (theme), Dropdown/Menu (user menu), Dialog or AlertDialog (sign-in modal, unsaved changes), Tabs (Sign in / Register), Sonner/Toast (save feedback), Skeleton, Badge ("View only"). `command` and `resizable` were removed with the code editor.

## Theme
The frontend uses the shadcn preset `b5rR41Mtnc` (applied in Iteration 1, after checking that it keeps the Base UI variant). **Light is the default**, with a Light/Dark toggle in the header. The choice is stored in the browser and applied before first paint to avoid a flash. The canvas follows the theme. The Payload admin panel is not themed by this (it stays `admin.theme: 'dark'`).

## UI performance
Server Components by default. Mark only interactive pieces `"use client"`. Do not wrap the whole layout in a client component. Lazy-load the canvas on the board page.
