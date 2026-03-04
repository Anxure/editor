<template>
  <div class="examples">
    <div class="box">

      <!-- ykx测试纠错 -->
      <div v-if="isYkxDev" class="ykx-test-editor">
        <umo-editor ref="editorRef" v-bind="testOptions">
        </umo-editor>
        <div class="test-panel">
          <button @click="handleFullTextCorrection">纠错</button>
        </div>
      </div>
      <umo-editor v-else ref="editorRef" v-bind="options" @exportWord="handleExportWord"
        @customSaveContent="handleCustomSaveContent">
        <template #paragraph_left_menu="props">
          <!-- <umo-menu-button>1111</umo-menu-button> -->
        </template>
        <template #extended-actions>
          <!-- <umo-menu-button>1111</umo-menu-button> -->
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

const editorRef = useTemplateRef('editorRef')
const isYkxDev = import.meta.env.MODE === 'ykx'
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
    show: false,
    // defaultMode: 'classic',
    menus: ['base'],
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
  disableExtensions: ['file'],
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
const testOptions = $ref({
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
      // {
      //     id: 'RULE_GRAMMAR_PROBLEM',
      //     name: '语法性问题',
      //     description: '语法性问题，核心是找语句不通顺的，你需要把纠错后的文本返回到fixCommand的params中的text字段中',
      //     severity: 'info',
      //     fixCommand: {
      //         action: 'replaceText',
      //         params: {
      //             text: '',
      //         }
      //     }
      // },
      {
        id: 'RULE_GRAMMAR_PROBLEM',
        name: '错别字问题',
        description: '错别字问题，需要注意携带上text_pos的from和to字段',
        severity: 'info',
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
      const openTest = false;
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
        return suggestions;
      } else {
        return Promise.resolve([
          {
            "id": "d61a82fb-d18b-483b-a632-af6d7998c1d8",
            "node_id": "dJmHlNge",
            "message": "错别字：'本几构'应为'本机构'；'究简报'应为'研究简报'；'本研'应为'本研究'",
            "rule_id": "RULE_GRAMMAR_PROBLEM",
            "text_index": 0,
            "text_pos": {
              "from": 118,
              "to": 121
            },
            "severity": "info",
            "fixCommand": {
              "action": "replaceText",
              "params": {
                "text": "本机构"
              }
            },
            "meta": {
              "section": "第一段"
            }
          },
          {
            "id": "e111309e-5806-4d53-bc28-c32649b5eaae",
            "node_id": "dJmHlNge",
            "message": "错别字：'本几构'应为'本机构'；'究简报'应为'研究简报'；'本研'应为'本研究'",
            "rule_id": "RULE_GRAMMAR_PROBLEM",
            "text_index": 0,
            "text_pos": {
              "from": 137,
              "to": 144
            },
            "severity": "info",
            "fixCommand": {
              "action": "replaceText",
              "params": {
                "text": "研究简报"
              }
            },
            "meta": {
              "section": "第一段"
            }
          },
          {
            "id": "8cf26127-932c-45f6-8243-a51117a1c21e",
            "node_id": "dJmHlNge",
            "message": "错别字：'本几构'应为'本机构'；'究简报'应为'研究简报'；'本研'应为'本研究'",
            "rule_id": "RULE_GRAMMAR_PROBLEM",
            "text_index": 0,
            "text_pos": {
              "from": 159,
              "to": 162
            },
            "severity": "info",
            "fixCommand": {
              "action": "replaceText",
              "params": {
                "text": "本研究"
              }
            },
            "meta": {
              "section": "第一段"
            }
          },
          {
            "id": "e86dd875-2509-4dc9-811c-46f4bde0433f",
            "node_id": "BVreN3Ww",
            "message": "错别字：'问字'应为'文字'",
            "rule_id": "RULE_GRAMMAR_PROBLEM",
            "text_index": 0,
            "text_pos": {
              "from": 11,
              "to": 15
            },
            "severity": "info",
            "fixCommand": {
              "action": "replaceText",
              "params": {
                "text": "文字"
              }
            },
            "meta": {
              "section": "第三段"
            }
          }
        ])
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