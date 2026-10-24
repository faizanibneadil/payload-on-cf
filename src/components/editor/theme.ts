// Editor aur read view dono yahi classes use karte hain — edit mode me jane par kuch hilta nahi.
// Plain object (koi Lexical import nahi), taa ke server ka read view bhi isay le sake.

export const documentClass =
  'board-document whitespace-pre-wrap break-words text-base leading-7 outline-none'

export const editorTheme = {
  paragraph: 'mb-3 last:mb-0',
  // Lexical list theme keys; nested = sirf andar wali list rakhne wala item (apna marker nahi)
  list: {
    ul: 'my-3 ml-6 list-disc first:mt-0',
    ol: 'my-3 ml-6 first:mt-0',
    // Payload jaisa (owner, B5): har list level ka apna number style — 1. → A. → a. → I. → i.
    olDepth: [
      'list-decimal',
      'list-[upper-alpha]',
      'list-[lower-alpha]',
      'list-[upper-roman]',
      'list-[lower-roman]',
    ],
    listitem: 'my-1',
    // Check list (owner, B6: Payload jaisa) — dabba aur tick `globals.css` me (`board-check*`)
    checklist: 'board-checklist',
    listitemChecked: 'board-check-checked',
    listitemUnchecked: 'board-check-unchecked',
    nested: { listitem: 'list-none board-list-wrapper' },
  },
  // Owner ka faisla (B3): baen taraf patli line, andar aur italic
  quote: 'my-4 border-l-2 pl-6 italic first:mt-0',
  // shadcn typography jaisa; pehli line par oopar ka margin nahi
  heading: {
    h1: 'mt-10 mb-4 text-4xl font-extrabold tracking-tight first:mt-0',
    h2: 'mt-8 mb-3 text-3xl font-semibold tracking-tight first:mt-0',
    h3: 'mt-6 mb-3 text-2xl font-semibold tracking-tight first:mt-0',
    h4: 'mt-6 mb-2 text-xl font-semibold tracking-tight first:mt-0',
    h5: 'mt-4 mb-2 text-lg font-semibold first:mt-0',
    h6: 'mt-4 mb-2 text-base font-semibold first:mt-0',
  },
}
