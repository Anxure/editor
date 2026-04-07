import { Extension, type Editor } from '@tiptap/core';
import { DecorationSet, Decoration } from '@tiptap/pm/view';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';

export interface FixCommand {
    action: string;
    params?: Record<string, any>;
}
export interface TextPosRange {
    from: number;
    to: number;
}

export interface Suggestion {
    id: string;
    /**
     * 文本范围：
     * - { from, to }：表示在对应 text 节点内部的局部区间（基于字符偏移）
     * 如果为空，则等同于 'full'
     */
    textPos?: TextPosRange | null;
    message: string;
    ruleId: string;
    severity: 'error' | 'warning' | 'info';
    text: string;
    originalHitText: string;
    notNeedFix?: boolean; // 是否需要同步修复（某些场景不需要联动）
    btns: string[]; // 按钮数组 accepted/ignored/confirmed 修复/忽略/确认
    /**
     * 后端返回的修复命令定义
     */
    fixCommand?: FixCommand | null;
    /**
     * 处理状态
     */
    handleStatus?: 'todo' | 'accepted' | 'ignored';
    meta?: Record<string, any>;
}

export interface DocumentSuggestOptions {
    backendUrl?: string;
    rules?: any[];
    // 返回 false 表示“本次不更新建议列表”（例如请求被取消）
    fetchSuggestions?: (doc: any, rules: any[], editor: Editor) => Promise<Suggestion[] | false>;
    /**
     * 自定义高亮装饰（比如挂载 tooltip 容器）
     */
    getCustomSuggestionDecoration?: (params: {
        suggestion?: Suggestion;
        /**
         * 当前所有仍然存在的建议列表
         * 可用于在外部检测某条 suggestion 是否已经被删除
         */
        allSuggestions: Suggestion[];
        /**
         * 当前建议在文档中的范围
         */
        range?: { from: number; to: number };
        /**
         * 当前 selection 是否完全落在这条建议范围内
         */
        isSelected: boolean;
        /**
         * 规则对应的展示标题（根据 rule_id 解析）
         */
        ruleTitle?: string;
        getDefaultDecorations?: () => Decoration[];
        /**
         * 点击建议区域回调
         */
        onSuggestionClick?: (suggestion: Suggestion) => void;
    }) => Decoration[];
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        documentSuggestions: {
            loadSuggestions: () => ReturnType;
            applySuggestion: (id: string) => ReturnType;
            applyAllSuggestions: () => ReturnType;
            rejectAllSuggestions: () => ReturnType;
            setSuggestionRules: (rules: any[]) => ReturnType;
            rejectSuggestion: (id: string) => ReturnType;
            /**
             * 触发某条建议的“闪动”效果，用于从外部面板指向对应文档位置
             */
            flashSuggestion: (id: string) => ReturnType;
            /**
             * 指向某条建议所在位置：滚动到视图中，并在到达后触发闪动效果
             */
            pointSuggestion: (id: string) => ReturnType;
        };
    }
}

/**
 * 根据 node_id、text_index 与 text_pos 计算建议在文档中的 from/to 位置
 */
function getSuggestionRange(params: {
    doc: any;
    suggestion: Suggestion;
}): { from: number; to: number } | null {
    const { doc, suggestion } = params;
    if (!suggestion.textPos) {
        return null;
    }
    return suggestion.textPos || { from: 0, to: 0 };
}
const documentSuggestPluginKey = new PluginKey('documentSuggest');

export const DocumentSuggest = Extension.create({
    name: 'documentSuggest',

    addOptions() {
        return {
            backendUrl: '',
            fetchSuggestions: undefined,
            getCustomSuggestionDecoration: undefined,
        };
    },

    addStorage() {
        return {
            isLoading: false,
            error: null as any,
            suggestions: [] as Suggestion[],
            // 用于触发某条建议的“闪动”效果
            flashId: null as string | null,
            // ✅ 是否存在“用户手动改正文”（用于外部二次确认）
            textDirty: false,
            // ✅ 忽略 dirty（用于内部修复/一键修复等会改 doc 的操作）
            // 用 depth 避免嵌套时 boolean 被过早恢复
            ignoreDirtyDepth: 0,
        };
    },
    addCommands() {
        const withIgnoreDirty = (fn: () => any) => {
            const storage = this.storage
            storage.ignoreDirtyDepth += 1
            try {
                return fn()
            } finally {
                // ✅ 延迟恢复：让同一次内部操作可能产生的后续 transaction 仍被忽略
                queueMicrotask(() => {
                    storage.ignoreDirtyDepth = Math.max(0, storage.ignoreDirtyDepth - 1)
                })
            }
        }
        const updateSuggestion = (suggestions: Suggestion[], id: string, info: Record<string, any>) => {
            const sIndex = suggestions.findIndex((s: Suggestion) => s.id === id);
            const target = [...suggestions][sIndex];
            if (sIndex !== -1) {
                suggestions.splice(sIndex, 1, {
                    ...target,
                    ...info,
                } as Suggestion);
            }
            return suggestions;
        }
        return {
            withIgnoreDirty: (fn: ((ctx: { editor: any; chain: any }) => any) | (() => any)) => ({ editor, chain }) => {
                withIgnoreDirty(() => {
                    if (typeof fn === 'function') {
                        // 支持两种用法：
                        // - editor.commands.withIgnoreDirty(() => editor.commands.xxx())
                        // - editor.commands.withIgnoreDirty(({ editor, chain }) => chain().xxx().run())
                        return (fn as any)({ editor, chain })
                    }
                })
                return true
            },
            loadSuggestions: () => ({ editor }) => {
                const isDev = (import.meta as any)?.env?.DEV;
                const storage = this.storage;
                // ✅ 重新检测开始，认为“当前 suggestions 对应的正文快照”已对齐
                storage.textDirty = false;
                storage.isLoading = true;
                storage.error = null;
                const findNearestTextblock = (doc: any, pos: number) => {
                    const $pos = doc.resolve(pos);
                    for (let d = $pos.depth; d >= 0; d--) {
                        const n = $pos.node(d);
                        if (n?.isTextblock) {
                            const nodePos = d === 0 ? 0 : $pos.before(d); // textblock 节点起点（绝对 pos）
                            const contentStartPos = $pos.start(d); // textblock 内容起点（绝对 pos）
                            return {
                                node: n,
                                depth: d,
                                nodePos,
                                contentStartPos,
                            };
                        }
                    }
                    return null;
                };
                // const docJson = editor.getJSON();
                // console.log('docJson', docJson);
                // console.log('docHtml', editor.getHTML());
                /**
                 * 生成给大模型/后端检测用的结构：
                 * - 扁平化：每个 text span 一条记录（避免 blocks->inlines 的嵌套）
                 * - originalTextPos 使用 ProseMirror 绝对坐标（从文档根起点开始计数）
                 * - attrs：取最近的 textblock（heading/paragraph 等）节点 attrs，并合并 text marks 样式（驼峰 key）
                 */
                type DocTextSpan = {
                    type: 'text';
                    text: string;
                    originalTextPos: { from: number; to: number };
                    attrs: Record<string, any>;
                };
                const docJson: DocTextSpan[] = [];
                const marksToStyleAttrs = (marks: any[] | null | undefined) => {
                    const styleAttrs: Record<string, any> = {};
                    for (const m of marks || []) {
                        const type = m?.type?.name;
                        if (type === 'bold') {
                            styleAttrs.fontWeight = 'bold';
                        }
                        if (type === 'textStyle') {
                            const a = m?.attrs || {};
                            for (const [k, v] of Object.entries(a)) {
                                if (v === null || v === undefined || v === '') continue;
                                // textStyle 的 attrs 在 tiptap 通常就是驼峰（color/fontFamily/fontSize...）
                                styleAttrs[String(k)] = v;
                            }
                        }
                    }
                    return styleAttrs;
                };
                editor.state.doc.descendants((node: any, pos: number) => {
                    if (!node?.isText || !node.text) return;

                    const info = findNearestTextblock(editor.state.doc, pos);
                    if (!info) return;

                    // ProseMirror 绝对坐标：pos 是 text node 的起点
                    // text node 的实际内容范围通常是 [pos, pos + text.length]
                    // 这里用 length 更贴合“文本范围”，也更适合 textBetween 校验
                    const from = pos;
                    const to = pos + node.text.length;
                    const styleAttrs = marksToStyleAttrs(node.marks);
                    docJson.push({
                        type: info.node.type.name === 'paragraph' ? 'text' : info.node.type.name,
                        text: node.text,
                        originalTextPos: { from, to },
                        attrs: {
                            ...(info.node.attrs || {}),
                            ...styleAttrs,
                        },
                    });
                });
                console.log(docJson, 'docJson');
                console.log(editor.getHTML(), 'editor.getHTML()');
                // const detectionNodeTypes = ['heading', 'paragraph', 'listItem', 'list', 'blockquote', 'table', 'tableRow', 'tableCell'];
                // 这里过滤第一层的自定义节点（仅保留一些特定节点）
                const rules = this.options.rules || [];

                // docJson.content = docJson.content?.filter((node: any) => detectionNodeTypes.includes(node.type) && node.content);
                (async () => {
                    try {
                        let suggestions: Suggestion[] | false = [];
                        if (this.options.fetchSuggestions) {
                            suggestions = await this.options.fetchSuggestions(docJson, rules, editor);
                        } else {
                            const resp = await fetch(this.options.backendUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    doc: docJson,
                                    rules: rules,
                                }),
                            });
                            if (!resp.ok) {
                                throw new Error('Failed to fetch suggestions');
                            }
                            const payload = await resp.json();
                            suggestions = (payload.data.suggestions || []) as Suggestion[];
                        }
                        if (isDev) console.log('suggestions', suggestions);
                        // 如果取消了则不触发
                        if (typeof suggestions === 'boolean' && !suggestions) {
                            return;
                        }
                        storage.suggestions = suggestions;
                        const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                            type: 'rebuildFromStorage',
                            isChangeSuggestions: true
                        });

                        editor.view.dispatch(tr)

                    } catch (error) {
                        storage.error = error;
                    } finally {
                        storage.isLoading = false;
                    }
                })();
                return true;
            },
            applySuggestion: (id: string) => ({ editor, chain }) => {
                const storage = this.storage;
                const target = storage.suggestions.find((s: Suggestion) => s.id === id);
                if (!target) {
                    return false;
                }

                const range = getSuggestionRange({ doc: editor.state.doc, suggestion: target });
                if (!range) {
                    return false;
                }

                const fix = target.fixCommand;
                const action = fix?.action;
                const params = fix?.params || {};

                // 没有可执行的修复命令，只高亮 & 标记为已处理
                if (!action) {
                    updateSuggestion(storage.suggestions, id, { handleStatus: 'accepted' });
                    // 显式触发一次基于 storage 的 DecorationSet 重建（因为文档本身并未发生变化）
                    const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                        type: 'rebuildFromStorage',
                    });
                    editor.view.dispatch(tr);
                    return true;
                }

                let execFlag = true;
                // ✅ 内部修复：忽略 dirty
                storage.ignoreDirty = true;
                withIgnoreDirty(() => {
                    try {
                        switch (action) {
                            case 'setHeading': {
                                const level = (Number(params.level) || 1) as any;
                                chain().focus().setTextSelection(range).setHeading({ level }).run();
                                break;
                            }
                            case 'resetTextStyle': {
                                // 清除颜色 / 背景色，后续可根据需要扩展
                                // TODO:看看是否需要特定action拆分开
                                execFlag = chain()
                                    .focus()
                                    .setTextSelection(range)
                                    .setColor('#000000')
                                    .unsetMark('backgroundColor')
                                    .run();
                                break;
                            }
                            case 'replaceText': {
                                const text = params.text ?? '';
                                execFlag = chain()
                                    .focus()
                                    .insertContentAt(range, text)
                                    .run();
                                break;
                            }
                            default: {
                                // 未知 action，暂不处理
                                return false;
                            }
                        }
                    } catch (error) {
                        console.error(error);
                    }
                });

                updateSuggestion(storage.suggestions, id, { handleStatus: 'accepted' });
                // 触发一次插件 state 重建 DecorationSet
                const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                    type: 'rebuildFromStorage',
                    isChangeSuggestions: true
                });
                editor.view.dispatch(tr);
                return execFlag;
            },
            applyAllSuggestions: () => ({ editor, chain }) => {
                const storage = this.storage;
                // ✅ 内部一键修复：忽略 dirty
                storage.ignoreDirty = true;
                withIgnoreDirty(() => {
                    try {
                        // 只处理当前仍为 todo 的建议，执行前实时根据 textPos 计算位置
                        const todoList = storage.suggestions.filter((s: Suggestion) => s.handleStatus === 'todo');
                        for (const s of todoList) {
                            const range = getSuggestionRange({ doc: editor.state.doc, suggestion: s });
                            if (!range || range.from >= range.to) continue;

                            const fix = s.fixCommand;
                            const action = fix?.action;
                            const params = fix?.params || {};
                            if (!action) continue;

                            switch (action) {
                                case 'setHeading': {
                                    const level = (Number(params.level) || 1) as any;
                                    chain().focus().setTextSelection(range).setHeading({ level }).run();
                                    break;
                                }
                                case 'resetTextStyle': {
                                    chain().focus()
                                        .setTextSelection(range)
                                        .unsetColor()
                                        .unsetMark?.('backgroundColor')
                                        .run();
                                    break;
                                }
                                case 'replaceText': {
                                    const text = params.text ?? '';
                                    chain().focus().insertContentAt(range, text).run();
                                    break;
                                }
                                default:
                                    break;
                            }
                        }
                    } catch (error) {
                        console.error(error);
                    }
                });
                // 仅同步 todo 项的状态；notNeedFix 在“应用”场景下保持原状
                storage.suggestions = storage.suggestions.map((s: Suggestion) => {
                    if (s.handleStatus !== 'todo') {
                        return s;
                    }
                    if (s.notNeedFix) {
                        return s;
                    }
                    return {
                        ...s,
                        handleStatus: 'accepted',
                    };
                });
                const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                    type: 'rebuildFromStorage',
                    isChangeSuggestions: true
                });
                editor.view.dispatch(tr);
                return true;
            },
            rejectOrConfirmAllSuggestions: () => ({ editor }) => {
                const storage = this.storage;
                // 只同步剩余 todo 项到 ignored（包括 notNeedFix）
                storage.suggestions = storage.suggestions.map((s: Suggestion) => {
                    if (s.handleStatus !== 'todo') {
                        return s;
                    }
                    return {
                        ...s,
                        // 这里confirmed和ignored是互斥的
                        handleStatus: s.btns.includes('confirmed') ? 'confirmed' : 'ignored',
                    };
                });
                const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                    type: 'rebuildFromStorage',
                    isChangeSuggestions: true
                });
                editor.view.dispatch(tr);
                return true;
            },
            setSuggestionRules: (rules: any[]) => () => {
                const storage = this.storage;
                storage.rules = rules;
                return true;
            },

            rejectSuggestion: (id: string) => ({ editor }) => {
                const storage = this.storage;
                updateSuggestion(storage.suggestions, id, { handleStatus: 'ignored' });
                // 触发一次插件 state 重建 DecorationSet
                const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                    type: 'rebuildFromStorage',
                    isChangeSuggestions: true
                });
                editor.view.dispatch(tr);
                return true;
            },
            confirmSuggestion: (id: string) => ({ editor }) => {
                const storage = this.storage;
                updateSuggestion(storage.suggestions, id, { handleStatus: 'confirmed' });
                // 触发一次插件 state 重建 DecorationSet
                const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                    type: 'rebuildFromStorage',
                    isChangeSuggestions: true
                });
                editor.view.dispatch(tr);
                return true;
            },
            flashSuggestion: (id: string) => ({ editor }) => {
                const storage = this.storage;
                const target = storage.suggestions.find((s: Suggestion) => s.id === id);
                if (!target) {
                    return false;
                }
                // 记录需要闪动的 suggestion id
                storage.flashId = id;
                // 触发一次 DecorationSet 重建，会在 buildDecorations 中为该 suggestion 添加动画类
                const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                    type: 'rebuildFromStorage',
                    isChangeSuggestions: false,
                });
                editor.view.dispatch(tr);
                return true;
            },
            pointSuggestion: (id: string) => ({ editor, chain }) => {
                const storage = this.storage;
                const target = storage.suggestions.find((s: Suggestion) => s.id === id);
                if (!target) {
                    return false;
                }
                const range = getSuggestionRange({ doc: editor.state.doc, suggestion: target });
                if (!range || !range.from || !range.to) {
                    return false;
                }

                // 1. 聚焦并将光标落在范围的结束点（默认结束点）
                chain().focus()
                    .setTextSelection(range.to)
                    .run();

                // 2. 滚动到视图中间
                try {
                    const { node } = editor.view.domAtPos(editor.state.selection.anchor);
                    (node as HTMLElement).scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                } catch (e) {
                    // domAtPos 失败时忽略滚动错误
                }

                // 3. 滚动触发后，再触发一次闪动效果（稍微延迟，避免与滚动竞争）
                window.setTimeout(() => {
                    editor.commands.flashSuggestion(id);
                }, 300);

                return true;
            },
        }
    },
    addProseMirrorPlugins() {
        const isDev = (import.meta as any)?.env?.DEV;
        const pluginKey = documentSuggestPluginKey;
        // isChangeSuggestions - 是否修改了意见项（应用/拒绝的场景下，需要主动调用一次外部更新，关闭弹框，主要是处理最后一个关闭意见无法关闭弹框的场景）
        const buildDecorations = (state: EditorState, suggestions: Suggestion[], isChangeSuggestions?: boolean): DecorationSet => {
            console.log(suggestions, 'suggestions');
            const todoSuggestions = suggestions.filter((s) => s.handleStatus == 'todo');
            const { doc, selection } = state as any;
            if (!todoSuggestions || todoSuggestions.length === 0) {
                // 调用一次外部更新(关闭弹框)
                if (isChangeSuggestions) {
                    if (this.options.getCustomSuggestionDecoration) {
                        this.options.getCustomSuggestionDecoration({
                            allSuggestions: todoSuggestions,
                            isSelected: false,
                            getDefaultDecorations: () => null,
                        });
                    }
                }
                return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];
            const getRuleText = (ruleId: string) => {
                const rule = this.options.rules?.find((r: any) => r.id === ruleId);
                return rule?.name || '';
            }
            if (isDev) console.log(todoSuggestions);
            for (const s of todoSuggestions) {
                // 这里调整为从storage里面从新获取suggestion（每次修复会更新最新的坐标）
                const changedSuggestion = this.storage.suggestions.find((cs: Suggestion) => cs.id === s.id);
                const range = getSuggestionRange({
                    doc,
                    suggestion: changedSuggestion,
                });
                if (isDev) console.log('range', range);
                if (!range) {
                    // 清空对应的option
                    continue;
                }

                // 失焦时不认为是“选中”，避免 tooltip 在编辑器 blur 后依然保持打开
                const hasFocus = this.editor?.view?.hasFocus?.() ?? true;
                const isSelected = hasFocus && selection.from >= range.from && selection.to <= range.to;

                const isFlashing = this.storage.flashId && this.storage.flashId === s.id;
                const base: Decoration[] = [
                    Decoration.inline(range.from, range.to, {
                        class: [
                            'ai-suggestion',
                            `ai-suggestion--${s.severity}`,
                            isFlashing ? 'ai-suggestion--flash' : '',
                        ].filter(Boolean).join(' '),
                        'data-suggestion-id': s.id,
                    }),
                ];
                if (this.options.getCustomSuggestionDecoration) {
                    const extra = this.options.getCustomSuggestionDecoration({
                        suggestion: s,
                        allSuggestions: todoSuggestions,
                        range,
                        isSelected,
                        ruleTitle: getRuleText(s.ruleId),
                        getDefaultDecorations: () => base,
                    });
                    if (Array.isArray(extra)) {
                        if (isDev) console.log(extra);
                        decorations.push(...extra);
                    } else {
                        decorations.push(...base);
                    }
                } else {
                    decorations.push(...base);
                }
            }
            // 本轮构建完成后，清除 flashId，方便下次重新触发动画
            if (this.storage.flashId) {
                this.storage.flashId = null;
            }
            return DecorationSet.create(doc, decorations);
        };

        return [
            new Plugin({
                key: pluginKey,
                state: {
                    init: (_config, state) => {
                        // 初始时根据当前 storage（一般为空）构建一次
                        return buildDecorations(state, this.storage.suggestions || []);
                    },
                    apply: (tr, old, oldState, newState) => {
                        let newSuggestions = this.storage.suggestions;
                        const meta = tr.getMeta(pluginKey);
                        // 显式要求：根据 storage 重建一次 DecorationSet
                        if (meta?.type === 'rebuildFromStorage') {
                            return buildDecorations(newState, newSuggestions, meta.isChangeSuggestions);
                        }
                        const ignoreDirty = (this.storage.ignoreDirtyDepth ?? 0) > 0
                        if (tr.docChanged) {
                            console.log(this.storage.ignoreDirtyDepth, tr.getMeta(pluginKey)?.type);
                        }
                        if (tr.docChanged && !ignoreDirty) {
                            this.storage.textDirty = true
                        }
                        // 文档或选区变化时，也根据当前 storage 重新计算一次
                        if (tr.docChanged || tr.selectionSet) {
                            let hasStatusChange = false; // 标记是否有状态变更
                            const mapping = tr.mapping;
                            // 映射所有待显示的建议坐标
                            newSuggestions = this.storage.suggestions.map(s => {
                                if (s.handleStatus !== 'todo' || s.textPos === undefined || s.notNeedFix) {
                                    return s;
                                }

                                // ✅ 传入旧坐标，生成新坐标
                                const newFrom = mapping.map(s.textPos?.from ?? 0, 1);
                                const newTo = mapping.map(s.textPos?.to ?? 0, -1);
                                if (isDev) console.log(newFrom, newTo);

                                let isInvalid = false;
                                if (newFrom >= newTo) {
                                    isInvalid = true; // 范围塌陷
                                } else {
                                    // 可选：进行文本内容比对，确保用户不是只删除了部分导致错位
                                    // 如果用户修改了文字，originalHitText 就不匹配了
                                    const currentText = newState.doc.textBetween(newFrom, newTo);
                                    if (s.originalHitText && currentText !== s.originalHitText) {
                                        isInvalid = true; // 内容被用户修改，不再匹配原始错误
                                    }
                                }

                                // 🚨 如果失效，自动标记为 ignored
                                if (isInvalid) {
                                    hasStatusChange = true;
                                    if (isDev) console.log(`Suggestion ${s.id} invalidated by user edit. Marking as ignored.`);
                                    return {
                                        ...s,
                                        handleStatus: 'ignored', // 关键：改变状态
                                        textPos: { from: newFrom, to: newTo } // 保留最后的位置供参考，虽然不会再渲染
                                    };
                                }
                                return {
                                    ...s,
                                    textPos: {
                                        from: newFrom,
                                        to: newTo
                                    }
                                };
                            });
                            this.storage.suggestions = newSuggestions;
                            return buildDecorations(newState, newSuggestions || [], hasStatusChange);
                        }

                        // 否则沿用旧的 DecorationSet，并映射到新文档
                        return old.map(tr.mapping, tr.doc);
                    },
                },
                props: {
                    decorations: (state) => {
                        return pluginKey.getState(state);
                    },
                    // focus 时如果光标位置没变化，不会触发 selectionSet，因此 tooltip 不会自动恢复
                    // 这里在 focus 主动触发一次 decorations 重建，让 tooltip 能按当前 selection 重新显示
                    handleDOMEvents: {
                        focus: (view) => {
                            const tr = view.state.tr.setMeta(pluginKey, {
                                type: 'rebuildFromStorage',
                            });
                            view.dispatch(tr);
                            return false;
                        },
                        // 增加区域点击（如果是处于纠错的区域触发对外的点击回调）
                        mousedown: (view, event) => {
                            const target = event.target as HTMLElement | null;
                            if (!target) return false;
                            const el = target.closest?.('[data-suggestion-id]') as HTMLElement | null;
                            if (!el) return false;
                            const suggestionId = el.getAttribute('data-suggestion-id');
                            if (!suggestionId) return false;
                            const suggestion = this.storage.suggestions.find((s: Suggestion) => s.id === suggestionId);
                            if (!suggestion) return false;
                            // 触发回调
                            this.options.onSuggestionClick?.(suggestion);
                            return true;
                        },
                    },
                },
            })
        ]
    }
})
