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
     * 块级节点的 nodeId（来自 attrs.nodeId）
     */
    node_id: string;
    /**
     * 文本节点索引（在该块级节点内部，仅统计 type === "text" 的节点，从 0 开始）
     * 如果为 null / undefined / 小于 0，表示整块节点（例如整段错误）
     */
    text_index?: number | null;
    /**
     * 文本范围：
     * - 'full'：表示整段 / 整个 text 节点
     * - { from, to }：表示在对应 text 节点内部的局部区间（基于字符偏移）
     * 如果为空，则等同于 'full'
     */
    text_pos?: 'full' | TextPosRange | null;
    message: string;
    rule_id: string;
    severity: 'error' | 'warning' | 'info';
    /**
     * 后端返回的修复命令定义
     */
    fixCommand?: FixCommand | null;
    meta?: Record<string, any>;
}

export interface DocumentSuggestOptions {
    backendUrl?: string;
    rules?: any[];
    fetchSuggestions?: (doc: any, rules: any[], editor: Editor) => Promise<Suggestion[]>;
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
    }) => Decoration[];
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        documentSuggestions: {
            loadSuggestions: () => ReturnType;
            applySuggestion: (id: string) => ReturnType;
            applyAllSuggestions: () => ReturnType;
            setSuggestionRules: (rules: any[]) => ReturnType;
            rejectSuggestion: (id: string) => ReturnType;
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

    let blockPos: number | null = null;
    let blockNode: any = null;

    // 先找到对应的块级节点
    doc.descendants((node: any, pos: number) => {
        if (node?.attrs?.nodeId === suggestion.node_id) {
            blockPos = pos;
            blockNode = node;
            return false; // 停止继续向下遍历
        }
        return true;
    });

    if (!blockNode || blockPos == null) {
        return null;
    }

    // text_index 为空 / 小于 0：视为整块节点
    if (suggestion.text_index == null || suggestion.text_index < 0) {
        const from = blockPos as number;
        const to = from + blockNode.nodeSize;
        return { from, to };
    }

    // 否则在块级节点内部，根据 text_index 找到对应的第 N 个 text 节点
    let currentTextIndex = -1;
    let foundFrom: number | null = null;
    let foundTo: number | null = null;

    let targetTextNode: any = null;
    let targetTextPos: number | null = null;
    blockNode.descendants((child: any, childPos: number) => {
        if (child.isText) {
            currentTextIndex += 1;
            if (currentTextIndex === suggestion.text_index) {
                // childPos 是相对于 blockNode 内容开始的位置，因此需要 + blockPos + 1
                const absoluteStart = blockPos! + 1 + childPos;
                targetTextNode = child;
                targetTextPos = absoluteStart;
                // 默认整段 text 节点
                foundFrom = absoluteStart;
                foundTo = absoluteStart + child.nodeSize;
                return false;
            }
        }
        return true;
    });

    if (targetTextNode == null || targetTextPos == null || foundFrom == null || foundTo == null) {
        return null;
    }

    // 处理 text_pos：
    // - 未提供 / 为 'full'：沿用整个 text 节点范围
    // - { from, to }：在 text 节点内部再做偏移
    const textPos = suggestion.text_pos;
    if (!textPos || textPos === 'full') {
        return { from: foundFrom, to: foundTo };
    }

    const innerFrom = Math.max(0, textPos.from ?? 0);
    const innerTo = Math.min(targetTextNode.text?.length ?? targetTextNode.nodeSize ?? 0, textPos.to ?? 0);
    if (innerTo <= innerFrom) {
        // 防御性处理：如果区间非法，退回整段
        return { from: foundFrom, to: foundTo };
    }

    const from = targetTextPos + innerFrom;
    const to = targetTextPos + innerTo;

    return { from, to };
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
        };
    },
    addCommands() {
        return {
            loadSuggestions: () => ({ editor }) => {
                const storage = this.storage;
                storage.isLoading = true;
                storage.error = null;
                const docJson = editor.getJSON();
                console.log('docJson', docJson);
                const detectionNodeTypes = ['heading', 'paragraph', 'listItem', 'list', 'blockquote', 'table', 'tableRow', 'tableCell'];
                // 这里过滤第一层的自定义节点（仅保留一些特定节点）
                const rules = this.options.rules || [];
                docJson.content = docJson.content.filter((node: any) => detectionNodeTypes.includes(node.type) && node.content);
                (async () => {
                    try {
                        let suggestions: Suggestion[] = [];
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
                        storage.suggestions = suggestions;
                        editor.view.dispatch(editor.state.tr)

                    } catch (error) {
                        storage.error = error;
                    } finally {
                        storage.isLoading = false;
                    }
                })();
                // Test 数据：实际场景中请使用上面的异步调用后端逻辑
                // setTimeout(() => {
                //     const res = {
                //         "errCode": 0,
                //         "errMessage": "success",
                //         "success": true,
                //         "data": {
                //             "suggestions": [
                //                 {
                //                     "id": "4d456c22-bd3e-41e7-84c6-7b83df1dbeb9",
                //                     "node_id": "F3BeLKun",
                //                     "message": "文字中出现红色（#F5222D），不符合文本颜色规范。",
                //                     "rule_id": "RULE_TEXT_COLOR_STYLE",
                //                     "text_index": 1,
                //                     "text_pos": {
                //                         "from": 0,
                //                         "to": 9
                //                     },
                //                     "severity": "warning",
                //                     "fixCommand": {
                //                         "action": "resetTextStyle",
                //                         "params": {
                //                             "color": ""
                //                         }
                //                     },
                //                     "meta": {
                //                         "section": "第三段"
                //                     }
                //                 },
                //                 {
                //                     "id": "d47797f2-7fd0-41cb-b4a3-f0b2072f3371",
                //                     "node_id": "F3BeLKun",
                //                     "message": "文字中出现背景色（#52C41A），不符合文本背景色规范。",
                //                     "rule_id": "RULE_TEXT_BACKGROUND_STYLE",
                //                     "text_index": 3,
                //                     "text_pos": {
                //                         "from": 0,
                //                         "to": 11
                //                     },
                //                     "severity": "warning",
                //                     "fixCommand": {
                //                         "action": "resetTextStyle",
                //                         "params": {
                //                             "backgroundColor": ""
                //                         }
                //                     },
                //                     "meta": {
                //                         "section": "第三段"
                //                     }
                //                 },
                //                 {
                //                     "id": "f5419e59-fd76-4264-a51f-e64d0c5f3540",
                //                     "node_id": "F3BeLKun",
                //                     "message": "错别字：'勇于测试纠错德话' → 应为'勇于测试纠错的话'或更正为'用于测试纠错的话'；'德'为错字。",
                //                     "rule_id": "RULE_GRAMMAR_PROBLEM",
                //                     "text_index": 0,
                //                     "text_pos": {
                //                         "from": 6,
                //                         "to": 7
                //                     },
                //                     "severity": "info",
                //                     "fixCommand": {
                //                         "action": "replaceText",
                //                         "params": {
                //                             "text": "的"
                //                         }
                //                     },
                //                     "meta": {
                //                         "section": "第三段"
                //                     }
                //                 },
                //                 {
                //                     "id": "04919e67-e62b-491e-b85a-4b0cd3f65854",
                //                     "node_id": "NoaCfRqM",
                //                     "message": "语序错误/错别字：'我是义的话一段语测试' → 应为'这是一段用于测试的话'或'我是用于测试的一段话'；'义的'疑似'用于'误输。",
                //                     "rule_id": "RULE_GRAMMAR_PROBLEM",
                //                     "text_index": 0,
                //                     "text_pos": {
                //                         "from": 2,
                //                         "to": 5
                //                     },
                //                     "severity": "info",
                //                     "fixCommand": {
                //                         "action": "replaceText",
                //                         "params": {
                //                             "text": "用于测试"
                //                         }
                //                     },
                //                     "meta": {
                //                         "section": "第四段"
                //                     }
                //                 }
                //             ]
                //         }
                //     };
                //     const mockSuggestions = res.data.suggestions as Suggestion[];
                //     storage.suggestions = mockSuggestions;
                //     // 触发一次插件 state 重建 DecorationSet
                //     const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                //         type: 'rebuildFromStorage',
                //     });
                //     editor.view.dispatch(tr);
                // }, 1000);

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
                    storage.suggestions = storage.suggestions.filter((s: Suggestion) => s.id !== id);
                    // 显式触发一次基于 storage 的 DecorationSet 重建（因为文档本身并未发生变化）
                    const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                        type: 'rebuildFromStorage',
                    });
                    editor.view.dispatch(tr);
                    return true;
                }

                let execFlag = true;
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
                            .unsetBackgroundColor()
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

                storage.suggestions = storage.suggestions.filter((s: Suggestion) => s.id !== id);
                // 触发一次插件 state 重建 DecorationSet
                const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                    type: 'rebuildFromStorage',
                    isChangeSuggestions: true
                });
                editor.view.dispatch(tr);
                return execFlag;
            },
            applyAllSuggestions: () => ({ editor }) => {
                const storage = this.storage;

                // 简单顺序执行，执行前实时根据 node_id + text_index 计算位置
                for (const s of [...storage.suggestions]) {
                    const range = getSuggestionRange({ doc: editor.state.doc, suggestion: s });
                    if (!range) continue;

                    const fix = s.fixCommand;
                    const action = fix?.action;
                    const params = fix?.params || {};
                    if (!action) continue;

                    const chain = editor.chain().focus();

                    switch (action) {
                        case 'setHeading': {
                            const level = (Number(params.level) || 1) as any;
                            chain.setTextSelection(range).setHeading({ level }).run();
                            break;
                        }
                        case 'resetTextStyle': {
                            chain
                                .setTextSelection(range)
                                .unsetColor()
                                .unsetMark?.('backgroundColor')
                                .run();
                            break;
                        }
                        case 'replaceText': {
                            const text = params.text ?? '';
                            chain.insertContentAt(range, text).run();
                            break;
                        }
                        default:
                            break;
                    }
                }

                // 清空所有建议
                storage.suggestions = [];
                return true;
            },
            setSuggestionRules: (rules: any[]) => () => {
                const storage = this.storage;
                storage.rules = rules;
                return true;
            },

            rejectSuggestion: (id: string) => ({ editor }) => {
                const storage = this.storage;
                storage.suggestions = storage.suggestions.filter((s: Suggestion) => s.id !== id);
                // 触发一次插件 state 重建 DecorationSet
                const tr = editor.state.tr.setMeta(documentSuggestPluginKey, {
                    type: 'rebuildFromStorage',
                    isChangeSuggestions: true
                });
                editor.view.dispatch(tr);
                return true;
            }
        }
    },
    addProseMirrorPlugins() {
        const pluginKey = documentSuggestPluginKey;
        // isChangeSuggestions - 是否修改了意见项（应用/拒绝的场景下，需要主动调用一次外部更新，关闭弹框，主要是处理最后一个关闭意见无法关闭弹框的场景）
        const buildDecorations = (state: EditorState, suggestions: Suggestion[], isChangeSuggestions?: boolean): DecorationSet => {
            const { doc, selection } = state as any;
            if (!suggestions || suggestions.length === 0) {
                // 调用一次外部更新(关闭弹框)
                if (isChangeSuggestions) {
                    if (this.options.getCustomSuggestionDecoration) {
                        this.options.getCustomSuggestionDecoration({
                            allSuggestions: suggestions,
                            isSelected: false,
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
            for (const s of suggestions) {
                const range = getSuggestionRange({
                    doc,
                    suggestion: s,
                });
                if (!range) {
                    continue;
                }

                const isSelected = selection.from >= range.from && selection.to <= range.to;

                const base: Decoration[] = [
                    Decoration.inline(range.from, range.to, {
                        class: `ai-suggestion ai-suggestion--${s.severity}`,
                        'data-suggestion-id': s.id,
                    }),
                ];

                if (this.options.getCustomSuggestionDecoration) {
                    const extra = this.options.getCustomSuggestionDecoration({
                        suggestion: s,
                        allSuggestions: suggestions,
                        range,
                        isSelected,
                        ruleTitle: getRuleText(s.rule_id),
                        getDefaultDecorations: () => base,
                    });
                    if (Array.isArray(extra)) {
                        decorations.push(...extra);
                    } else {
                        decorations.push(...base);
                    }
                } else {
                    decorations.push(...base);
                }
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
                        const meta = tr.getMeta(pluginKey);
                        // 显式要求：根据 storage 重建一次 DecorationSet
                        if (meta?.type === 'rebuildFromStorage') {
                            return buildDecorations(newState, this.storage.suggestions || [], meta.isChangeSuggestions);
                        }

                        // 文档或选区变化时，也根据当前 storage 重新计算一次
                        if (tr.docChanged || tr.selectionSet) {
                            return buildDecorations(newState, this.storage.suggestions || []);
                        }

                        // 否则沿用旧的 DecorationSet，并映射到新文档
                        return old.map(tr.mapping, tr.doc);
                    },
                },
                props: {
                    decorations: (state) => {
                        return pluginKey.getState(state);
                    }
                },
            })
        ]
    }
})
