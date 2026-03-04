// extensions/nodeId.ts
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { nanoid } from 'nanoid'

export const NodeId = Extension.create({
  name: 'nodeId',

  addGlobalAttributes() {
    return [
      {
        // 给这些块级节点统一加上 nodeId 属性
        types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'codeBlock'],
        attributes: {
          nodeId: {
            // 默认值为 null，新建节点时由 ProseMirror 插件自动补充
            default: null,
            // 从 HTML 中解析已有的 data-node-id，保持不变
            parseHTML: element => element.getAttribute('data-node-id'),
            // 将 attrs.nodeId 写回 DOM
            renderHTML: attrs =>
              attrs.nodeId
                ? { 'data-node-id': attrs.nodeId as string }
                : {},
          }
        },
      },
    ]
  },

  /**
   * 使用 ProseMirror 插件，在事务结束后为缺少 nodeId 的节点自动补一个随机 ID。
   * 这样无论是初始内容还是新建段落/标题，最终 JSON 结构里都会有稳定的 attrs.nodeId。
   */
  addProseMirrorPlugins() {
    const types = ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock']

    return [
      new Plugin({
        key: new PluginKey('nodeId-autofill'),
        appendTransaction(_transactions, _oldState, newState) {
          let tr = newState.tr
          let modified = false
          const used = new Set<string>()

          newState.doc.descendants((node, pos) => {
            if (!types.includes(node.type.name)) return

            const currentId = node.attrs.nodeId as string | null

            // 已有且未重复的 nodeId，直接记录并跳过
            if (currentId && !used.has(currentId)) {
              used.add(currentId)
              return
            }

            // 缺失或重复时，生成一个新的唯一 ID
            let nextId = nanoid(8)
            while (used.has(nextId)) {
              nextId = nanoid(8)
            }
            used.add(nextId)

            tr = tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              nodeId: nextId,
            })
            modified = true
          })

          return modified ? tr : null
        },
      }),
    ]
  },
})