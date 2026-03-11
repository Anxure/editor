import type { Editor } from '@tiptap/core'
import { isEqual, cloneDeep } from 'lodash-es'

type MapFn<T, R> = (arg: T) => R
function mapSelf<T>(d: T): T {
  return d
}

/**
 * 监听 editorRef.value.storage 上的数据变化（editor 异步创建也没关系）
 */
export function useEditorStorage<T, R = T>(
  editorRef: Ref<Editor | null | undefined>,
  getter: (storage: Editor['storage']) => T,
  defaultValue?: T,
  map?: (arg: T) => R,
) {
  const mapFn = (map || mapSelf) as MapFn<T, R>

  const initialRaw =
    defaultValue !== undefined
      ? defaultValue
      : editorRef.value
        ? getter(editorRef.value.storage)
        : (undefined as unknown as T)

  const valueRef = ref<R>(mapFn(initialRaw as T))
  let prevValueCache = cloneDeep(valueRef.value as any)

  // 当 editorRef 从 null -> Editor 时，重新挂事件
  watch(
    editorRef,
    (editor, _prevEditor, onCleanup) => {
      if (!editor) return

      const listener = () => {
        let raw: T
        try {
          raw = getter(editor.storage)
        } catch {
          raw = (defaultValue as T) ?? (undefined as unknown as T)
        }
        const next = mapFn(raw)
        if (isEqual(prevValueCache, next)) return
          ; (valueRef.value as any) = next
        prevValueCache = cloneDeep(next as any)
      }

      // 先跑一次，避免等事件
      listener()

      editor.on('transaction', listener)
      editor.on('selectionUpdate', listener)

      onCleanup(() => {
        editor.off('transaction', listener)
        editor.off('selectionUpdate', listener)
      })
    },
    { immediate: true },
  )
  return valueRef
}