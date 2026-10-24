// Editor aur read view dono yahi classes use karte hain — edit mode me jane par kuch hilta nahi.
// Plain object (koi Lexical import nahi), taa ke server ka read view bhi isay le sake.

export const documentClass =
  'board-document whitespace-pre-wrap break-words text-base leading-7 outline-none'

export const editorTheme = {
  paragraph: 'mb-3 last:mb-0',
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
