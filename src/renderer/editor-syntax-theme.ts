import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

/**
 * Syntax colors come from `--editor-*` custom properties (theme.css) so one palette per theme
 * keeps every token readable on the editor background. The stock highlight style is tuned for
 * a white page and fails contrast on the dark theme.
 */
const style = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: 'var(--editor-keyword)' },
  { tag: [tags.string, tags.regexp, tags.special(tags.string)], color: 'var(--editor-string)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--editor-number)' },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: 'var(--editor-comment)',
    fontStyle: 'italic',
  },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.definition(tags.variableName)],
    color: 'var(--editor-name)',
  },
  { tag: [tags.typeName, tags.className, tags.propertyName], color: 'var(--editor-name)' },
  { tag: [tags.punctuation, tags.bracket, tags.separator], color: 'var(--editor-punct)' },
  { tag: [tags.invalid], color: 'var(--anatomy-red)' },
])

export const editorSyntaxTheme = syntaxHighlighting(style)
