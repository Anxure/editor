import { type Dispatch, type Editor, Extension } from '@tiptap/core'
import {
  AllSelection,
  type EditorState,
  TextSelection,
  type Transaction,
} from '@tiptap/pm/state'
import { isFunction } from '@tool-belt/type-predicates'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
    }
    outdent: {
      outdent: () => ReturnType
    }
  }
}

// @weiruo/tiptap-extension-indent Version:2.0.4-1
const classAttrPrefix = 'indent-'
export default Extension.create({
  name: 'indent',
  addOptions() {
    return {
      types: ['heading', 'listItem', 'taskItem', 'paragraph'],
      minLevel: 0,
      maxLevel: 5,
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: null,
            renderHTML: (attributes) => {
              const { indent } = attributes
              const { minLevel } = this.options
              if (!indent || indent <= minLevel) {
                return {}
              }
              return {
                style: `text-indent: ${indent * 2}em;`,
              }
            },
            // renderHTML: (attributes) => {
            //   if (!attributes.indent) {
            //     return {}
            //   }
            //   if (attributes.indent > this.options.minLevel) {
            //     return {
            //       class: `${classAttrPrefix}${attributes.indent}`,
            //     }
            //   }
            //   return {}
            // },
            parseHTML: (element) => {
              const { textIndent } = element.style

              if (!textIndent) {
                return null
              }
              const match = textIndent.match(/([\d.]+)/)
              if (!match) {
                return null
              }
              const value = Number.parseFloat(match[1])
              if (Number.isNaN(value)) {
                return null
              }
              const base = Number.parseFloat(this.options.indentSize)
              if (!base) {
                return null
              }
              const level = Math.round(value / base)
              return level > this.options.minLevel ? level : null
            },
          },
        },
      },
    ]
  },
  addCommands() {
    const setNodeIndentMarkup = (
      tr: Transaction,
      pos: number,
      delta: number,
    ) => {
      const node = tr.doc.nodeAt(pos)
      if (!node) return tr
      const nextLevel = (node.attrs.indent || 0) + delta
      const { minLevel, maxLevel } = this.options
      let indent = nextLevel
      if (nextLevel < minLevel) indent = minLevel
      if (nextLevel > maxLevel) indent = maxLevel
      if (indent !== node.attrs.indent) {
        const attrs = { ...node.attrs }
        delete attrs.indent
        const nextAttrs = indent > minLevel ? { ...attrs, indent } : attrs
        return tr.setNodeMarkup(pos, node.type, nextAttrs, node.marks)
      }
      return tr
    }
    const updateIndentLevel = (tr: Transaction, delta: number) => {
      const { doc, selection } = tr
      if (
        selection instanceof TextSelection ||
        selection instanceof AllSelection
      ) {
        const { from, to } = selection
        doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            tr = setNodeIndentMarkup(tr, pos, delta)
            return false
          }
          return true
        })
      }
      return tr
    }
    const applyIndent =
      (direction: number) =>
        () =>
          ({
            tr,
            state,
            dispatch,
            editor,
          }: {
            tr: Transaction
            state: EditorState
            dispatch: Dispatch
            editor: Editor
          }) => {
            const { selection } = state
            tr.setSelection(selection)
            tr = updateIndentLevel(tr, direction)
            if (tr.docChanged) {
              if (isFunction(dispatch)) {
                dispatch(tr)
              }
              return true
            }
            return false
          }
    return {
      indent: applyIndent(1),
      outdent: applyIndent(-1),
    }
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList')
        ) {
          return this.editor.commands.sinkListItem('listItem')
        }
        if (this.editor.isActive('taskList')) {
          return this.editor.commands.sinkListItem('taskItem')
        }
        return this.editor.commands.indent()
      },
      'Shift-Tab': () => {
        if (
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList')
        ) {
          return this.editor.commands.liftListItem('listItem')
        }
        if (this.editor.isActive('taskList')) {
          return this.editor.commands.liftListItem('taskItem')
        }
        return this.editor.commands.outdent()
      },
    }
  },
})
