import type { ElementTransformer } from '@lexical/markdown'
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from '@lexical/react/LexicalHorizontalRuleNode'
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'
import { Minus } from 'lucide-react'
import type { EditorFeature } from './types'

/**
 * `--- ` (line ke shuru me, Payload jaisa) se line. Agar neeche koi line na ho to khali line rehti he
 * taa ke likhna line ke neeche jaari rahe (Lexical playground jaisa).
 */
const HORIZONTAL_RULE: ElementTransformer = {
  type: 'element',
  dependencies: [HorizontalRuleNode],
  export: (node) => ($isHorizontalRuleNode(node) ? '---' : null),
  regExp: /^---\s*$/,
  replace: (parentNode, _children, _match, isImport) => {
    const line = $createHorizontalRuleNode()
    if (isImport || parentNode.getNextSibling() != null) parentNode.replace(line)
    else parentNode.insertBefore(line)
    line.selectNext()
  },
}

/**
 * Horizontal rule — Payload ka HorizontalRuleFeature: `--- `, ya slash menu > Basic > Horizontal Rule.
 * Line par click = select (ring), phir Backspace/Delete se hat jati he (Lexical).
 */
export const horizontalRuleFeature: EditorFeature = {
  key: 'horizontalRule',
  nodes: [HorizontalRuleNode],
  markdown: [HORIZONTAL_RULE],
  plugins: [HorizontalRulePlugin],
  slashMenu: {
    group: 'basic',
    items: [
      {
        key: 'horizontalRule',
        label: 'Horizontal Rule',
        keywords: ['hr', 'horizontal rule', 'line', 'separator'],
        icon: Minus,
        onSelect: (editor) => {
          editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
        },
      },
    ],
  },
}
