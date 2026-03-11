<template>
  <div class="examples">
    <div class="box">

      <!-- ykx测试纠错 -->
      <div v-if="isYkxDev" class="ykx-test-editor">
        <div style="height: 500px;">

          <umo-editor ref="editorRef" v-bind="testOptions">
          </umo-editor>
        </div>

        <div class="test-panel">
          <button @click="handleFullTextCorrection">纠错</button>
          <div style="margin-top: 10px;">
            <button @click="handleApplyAllSuggestions">应用所有</button>
            <button @click="handleRejectAllSuggestions">拒绝所有</button>
          </div>
          <ul>
            <li v-for="suggestion in editorSuggestions" :key="suggestion.id">
              <div>
                {{ suggestion.message }}
              </div>
              <div>
                <button @click="handleApplySuggestion(suggestion)">应用</button>
                <button @click="handleRejectSuggestion(suggestion)">拒绝</button>
                <button @click="handlePointToSuggestion(suggestion)">定位</button>
              </div>

            </li>

          </ul>
        </div>
      </div>
      <umo-editor v-else ref="editorRef" v-bind="options" @exportWord="handleExportWord"
        @customSaveContent="handleCustomSaveContent">
        <template #paragraph_left_menu="props">
          <!-- <umo-menu-button>1111</umo-menu-button> -->
        </template>
        <template #extended-actions>
          <umo-menu-button>1111</umo-menu-button>
        </template>
      </umo-editor>
    </div>
    <!-- <div class="box">
      <umo-editor editor-key="testaaa" :toolbar="{ defaultMode: 'classic' }" />
    </div> -->

  </div>
</template>

<script setup lang="ts">
import { shortId } from '@/utils/short-id'
import { useEditorStorage } from '@/hooks/useEditorStrorage'

const editorRef = useTemplateRef('editorRef')
const isYkxDev = import.meta.env.MODE === 'ykx'
const editorInstanceRef = computed(() => editorRef.value?.useEditor?.() ?? null)
console.log('editorInstance', editorInstanceRef.value)
// 通过hook拿到建议列表，保持更新

const editorSuggestions = useEditorStorage<any[], any[]>(
  editorInstanceRef,
  (storage) => (storage as any).documentSuggest?.suggestions ?? [],
  [],
)
// const cptSuggestions = computed(() => editorSuggestions.value)
const templates = [
  {
    title: '工作任务',
    description: '工作任务模板',
    content:
      '<h1>工作任务</h1><h3>任务名称：</h3><p>[任务的简短描述]</p><h3>负责人：</h3><p>[执行任务的个人姓名]</p><h3>截止日期：</h3><p>[任务需要完成的日期]</p><h3>任务详情：</h3><ol><li>[任务步骤1]</li><li>[任务步骤2]</li><li>[任务步骤3]...</li></ol><h3>目标：</h3><p>[任务需要达成的具体目标或结果]</p><h3>备注：</h3><p>[任何额外信息或注意事项]</p>',
  },
  {
    title: '工作周报',
    description: '工作周报模板',
    content:
      '<h1>工作周报</h1><h2>本周工作总结</h2><hr /><h3>已完成工作：</h3><ul><li>[任务1名称]：[简要描述任务内容及完成情况]</li><li>[任务2名称]：[简要描述任务内容及完成情况]</li><li>...</li></ul><h3>进行中工作：</h3><ul><li>[任务1名称]：[简要描述任务当前进度和下一步计划]</li><li>[任务2名称]：[简要描述任务当前进度和下一步计划]</li><li>...</li></ul><h3>问题与挑战：</h3><ul><li>[问题1]：[描述遇到的问题及当前解决方案或需要的支持]</li><li>[问题2]：[描述遇到的问题及当前解决方案或需要的支持]</li><li>...</li></ul><hr /><h2>下周工作计划</h2><h3>计划开展工作：</h3><ul><li>[任务1名称]：[简要描述下周计划开始的任务内容]</li><li>[任务2名称]：[简要描述下周计划开始的任务内容]</li><li>...</li></ul><h3>需要支持与资源：</h3><ul><li>[资源1]：[描述需要的资源或支持]</li><li>[资源2]：[描述需要的资源或支持]</li><li>...</li></ul>',
  },
]
console.log('editorRef', editorRef)
const handleCustomSaveContent = () => {
  console.log('handleCustomSaveContent')
  editorRef.value?.saveContentStatus(true)
}
const handleExportWord = () => {
  console.log('handleExportWord')
}
const handleFullTextCorrection = () => {
  const editor = editorRef.value?.useEditor?.()
  editor?.chain().loadSuggestions().run()
}

const options = $ref({
  toolbar: {
    showToggleToolbar: false,
    // show: false,
    // defaultMode: 'classic',
    // menus: ['base'],
  },
  document: {
    title: '测试文档',
    content: localStorage.getItem('document.content') ?? '<p>测试文档</p>',
    characterLimit: 10000,
  },
  page: {
    layouts: ['page', 'web'],
    showBookmark: true,
  },
  templates,
  cdnUrl: 'https://cdn.umodoc.com',
  shareUrl: 'https://www.umodoc.com',
  file: {
    // allowedMimeTypes: [
    //   'application/pdf',
    //   'image/svg+xml',
    //   'video/mp4',
    //   'audio/*',
    // ],
  },
  importWord: {
    enabled: true,
    // async onCustomImportMethod() {
    //   return await Promise.resolve({
    //     value: '<p>测试导入word</p>',
    //   })
    // },
  },
  ai: {
    assistant: {
      enabled: true,
      async onMessage() {
        return await Promise.resolve('<p>AI助手测试</p>')
      },
    },
  },
  user: {
    id: 'umoeditor',
    label: 'Umo Editor',
    avatar: 'https://tdesign.gtimg.com/site/avatar.jpg',
  },
  users: [
    { id: 'umodoc', label: 'Umo Team' },
    { id: 'Cassielxd', label: 'Cassielxd' },
    { id: 'Goldziher', label: "Na'aman Hirschfeld" },
    { id: 'SerRashin', label: 'SerRashin' },
    { id: 'ChenErik', label: 'ChenErik' },
    { id: 'china-wangxu', label: 'china-wangxu' },
    { id: 'Sherman Xu', label: 'xuzhenjun130' },
    { id: 'testuser', label: '测试用户' },
  ],
  // https://dev.umodoc.com/cn/docs/options/extensions#disableextensions
  disableExtensions: ['file', 'full-text-correction'],
  async onSave(content: string, page: number, document: { content: string }) {
    localStorage.setItem('document.content', document.content)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const success = true
        if (success) {
          console.log('onSave', { content, page, document })
          resolve('操作成功')
        } else {
          reject(new Error('操作失败'))
        }
      }, 2000)
    })
  },
  async onFileUpload(file: File & { url?: string }) {
    if (!file) {
      throw new Error('没有找到要上传的文件')
    }
    console.log('onUpload', file)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    return {
      id: shortId(),
      url: file.url ?? URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size,
    }
  },
  onFileDelete(id: string, url: string, type: string) {
    console.log(id, url, type)
  },
})


/**
 * 根据错误词、所在段落文本和段落的全局位置，计算错误词的全局坐标
 *
 * @param {Object} suggestion - 后端返回的建议对象
 * @param {string} suggestion.text - 包含错误的完整段落文本
 * @param {string} suggestion.errorWord - 具体的错误词
 * @param {Object} suggestion.originalTextPos - 段落在全局的 {from, to}
 * @param {number} suggestion.appearTimes - 该错误词在段落中是第几次出现 (从 1 开始)
 * @returns {Object|null} - 返回 { from: number, to: number }，如果找不到则返回 null
 */
function calculateErrorPosition(suggestion: any) {
  const { text, errorWord, originalTextPos, appearTimes } = suggestion;
  const appearTimesNum = parseInt(appearTimes); // 防止传入的是字符串
  // 1. 基础校验
  if (!text || !errorWord || !originalTextPos) {
    console.warn("缺少必要字段，无法计算坐标");
    return null;
  }

  const segmentStart = originalTextPos.from;

  // 2. 在 text 中查找 errorWord 的第 appearTimes 次出现位置
  let startIndex = -1;
  let count = 0;
  let currentSearchIndex = 0;

  // 循环查找，直到找到第 N 次出现
  while (count < appearTimesNum) {
    const foundIndex = text.indexOf(errorWord, currentSearchIndex);

    if (foundIndex === -1) {
      // 如果还没找到第 N 次就结束了，说明数据有问题或 appearTimes 越界
      console.warn(`未在文本中找到第 ${appearTimesNum} 次出现的错误词 "${errorWord}"`);
      return null;
    }

    count++;
    if (count === appearTimesNum) {
      startIndex = foundIndex;
    } else {
      // 继续往后找，避免死循环 (从找到位置的下一个字符开始)
      currentSearchIndex = foundIndex + 1;
    }
  }

  if (startIndex === -1) {
    return null;
  }

  // 3. 计算全局绝对坐标
  const globalFrom = segmentStart + startIndex;
  const globalTo = globalFrom + errorWord.length;
  const endIndex = startIndex + errorWord.length;
  return {
    from: globalFrom,
    to: globalTo,
    originalHitText: text.slice(startIndex, endIndex)
  };
}

const editorPointToSuggestion = (id: string) => {
  const editor = editorRef.value?.useEditor?.()
  editor?.commands.pointSuggestion(id)
}
const handlePointToSuggestion = (suggestion: any) => {
  const editor = editorRef.value?.useEditor?.()
  editor?.commands.pointSuggestion(suggestion.id)
}
const handleApplySuggestion = (suggestion: any) => {
  const editor = editorRef.value?.useEditor?.()
  editor?.chain().applySuggestion(suggestion.id).run()
  editorPointToSuggestion(suggestion.id)
}
const handleRejectSuggestion = (suggestion: any) => {
  const editor = editorRef.value?.useEditor?.()
  editor?.chain().rejectSuggestion(suggestion.id).run()
  editorPointToSuggestion(suggestion.id)
}
const handleApplyAllSuggestions = () => {
  const editor = editorRef.value?.useEditor?.()
  editor?.chain().applyAllSuggestions().run()
}
const handleRejectAllSuggestions = () => {
  const editor = editorRef.value?.useEditor?.()
  editor?.chain().rejectAllSuggestions().run()
}
const testOptions = $ref({
  document: {
    content: '<p data-node-id="E0kcQn6a">新闻媒体基于学术研究和观点讨论而对本研究简报的引用受到鼓励，但这种引用必须以不损害本研究机构的知识产权和商业利益为前提。新闻媒体对研究简报的引用应该获得本几构公关传媒部的许可，但究简报的观点不得对本研进行有悖原意的引用和修改。</p><p data-node-id="dj2hicfm">我是一段策试文字111，我是测试文字一段222</p><p data-node-id="QszUBR5J">我是一段有错别字的问字</p><p data-node-id="QszUBR5J">我是一段有搓别字的问字1</p>'
  },
  documentSuggestConfig: {
    rules: [
      {
        id: 'RULE_TITLE_SIZE',
        name: '标题字号规范',
        description: '标题(查找type为ul、li、heading的节点)必须使用h1-h6, params的level可以返回1-6',
        severity: 'warning',
        fixCommand: {
          action: 'setHeading',
          params: {
            level: 1,
          }
        }
      },
      {
        id: 'RULE_TEXT_COLOR_STYLE',
        name: '文本颜色规范',
        description: '文字里面不能出现红色， 你检测到后不用给参数给我',
        severity: 'warning',
        fixCommand: {
          action: 'resetTextStyle',
          params: {
            color: '',
          }
        }
      },
      {
        id: 'RULE_TEXT_BACKGROUND_STYLE',
        name: '文本背景色规范',
        description: '文字块不能出现背景色, 你检测到后不用给参数给我',
        severity: 'warning',
        fixCommand: {
          action: 'resetTextStyle',
          params: {
            backgroundColor: ''
          }
        }
      },
      {
        id: 'RULE_GRAMMAR_PROBLEM',
        name: '语法性问题',
        description: '语法性问题，核心是找语句不通顺的，你需要把纠错后的文本返回到fixCommand的params中的text字段中',
        severity: 'warning',
        fixCommand: {
          action: 'replaceText',
          params: {
            text: '',
          }
        }
      },
      {
        id: 'RULE_GRAMMAR_PROBLEM',
        name: '错别字问题',
        description: '错别字问题，需要注意携带上text_pos的from和to字段',
        severity: 'warning',
        fixCommand: {
          action: 'replaceText',
          params: {
            text: '',
          }
        }
      },
      // {
      //     id: 'RULE_FONT_FAMILY',
      //     name: '字体规范',
      //     description: '需采用仿宋字体',
      //     severity: 'error',
      //     fixCommand: {
      //         action: 'setFontFamily',
      //         params: {
      //             family: '仿宋',
      //         }
      //     }
      // },
    ],
    fetchSuggestions: async (doc: any, rules: any[], editor: any) => {
      const openTest = true;
      if (!openTest) {
        let suggestions = [];
        const resp = await fetch('http://localhost:8010/api/v1/ai/document/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            doc,
            rules: rules,
          }),
        });
        if (!resp.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        const payload = await resp.json();
        suggestions = (payload.data.suggestions || []);
        return suggestions.map((item: any) => ({ ...item, handleStatus: 'todo' }));
      } else {
        console.log(doc);
        const targetList = [
          {
            "id": "1",
            "message": "错别字",
            "ruleId": "9",
            "appearTimes": "1",
            "errorWord": "问字",
            "originalTextPos": {
              "from": 141,
              "to": 152
            },
            "severity": "warning",
            "fixCommand": {
              "action": "replaceText",
              "params": {
                "text": "文字"
              }
            },
            "meta": {
              "section": "无"
            },
            "text": "我是一段有错别字的问字"
          },
          {
            "id": "validScopeMsgMap",
            "message": "各地动态内容字数需满足：≥300 且 <600 字",
            "ruleId": null,
            "appearTimes": null,
            "errorWord": null,
            "originalTextPos": null,
            "severity": null,
            "fixCommand": null,
            "meta": null,
            "text": null
          }
        ];
        const result = targetList.map((item) => {
          const calcInfo = calculateErrorPosition(item);
          return {
            ...item,
            originalHitText: calcInfo?.originalHitText ?? '',
            notNeedFix: item.id === 'validScopeMsgMap', // 增加一个不需修复的标识
            textPos: {
              from: calcInfo?.from,
              to: calcInfo?.to,
            },
            handleStatus: 'todo'
          }
        });
        return Promise.resolve(result);
      }
    }
  },
})
</script>

<style lang="less">
html,
body {
  padding: 0;
  margin: 0;
}

.examples {
  margin: 20px;
  display: flex;
  height: calc(100vh - 40px);
}

.box {
  border: solid 1px #ddd;
  box-sizing: border-box;
  position: relative;
  width: 100%;
  height: 100%;
}

html,
body {
  height: 100vh;
  overflow: hidden;
}

.ykx-test-editor {
  position: relative;

  .test-panel {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1000;
    width: 300px;
    height: 300px;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    background-color: #fff;
  }
}
</style>