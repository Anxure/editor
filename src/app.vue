<template>
  <div class="examples">
    <div class="box">

      <!-- ykx测试纠错 -->
      <div v-if="isYkxDev" class="ykx-test-editor">

        <umo-editor ref="editorRef" v-bind="testOptions">
        </umo-editor>

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
          <button @click="handleGetTextDirty">获取正文是否变动字段</button>
        </div>
      </div>
      <umo-editor v-else ref="editorRef" v-bind="options" @exportWord="handleExportWord"
        @customSaveContent="handleCustomSaveContent">
        <template #paragraph_left_menu="props">
          <!-- <umo-menu-button>1111</umo-menu-button> -->
        </template>
        <template #extended-actions>
          <t-button size="small" variant="text" @click="handleOpenImportHtmlDialog">
            导入HTML测试
          </t-button>
          <t-button size="small" variant="text" @click="handleGetHtmlContent">
            获取html内容
          </t-button>
        </template>
      </umo-editor>

      <t-dialog v-model:visible="importHtmlDialogVisible" header="导入HTML测试" width="720px"
        :confirm-btn="{ content: '确定' }" :cancel-btn="{ content: '取消' }" @confirm="handleConfirmImportHtml"
        @close="handleCloseImportHtmlDialog" @cancel="handleCloseImportHtmlDialog">
        <t-textarea v-model="importHtmlValue" placeholder="在这里粘贴/输入 HTML..." :autosize="{ minRows: 14, maxRows: 26 }" />
      </t-dialog>
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
  editor?.chain().rejectSuggestion(suggestion.id).run();
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
const handleGetTextDirty = () => {
  const editor = editorRef.value?.useEditor?.()
  console.log('getTextDirty', editor?.storage.documentSuggest.textDirty)
}
let importHtmlDialogVisible = $ref(false)
let importHtmlValue = $ref('')
const handleOpenImportHtmlDialog = () => {
  // const editor = editorRef.value?.useEditor?.()
  // importHtmlValue = editor?.getHTML?.() ?? ''
  importHtmlDialogVisible = true
}
const handleGetHtmlContent = () => {
  const editor = editorRef.value?.useEditor?.()
  console.log('importHtmlValue', editor?.getHTML?.())
}
const handleCloseImportHtmlDialog = () => {
  importHtmlDialogVisible = false
}
const handleConfirmImportHtml = () => {
  const editor = editorRef.value?.useEditor?.()
  if (editor) {
    editor.chain().setContent(importHtmlValue || '<p></p>', true).focus().run()
  }
  importHtmlDialogVisible = false
}
const testOptions = $ref({
  document: {
    content: ''
  },
  documentSuggestConfig: {
    onSuggestionClick: (suggestion: any) => {
      console.log('onSuggestionClick', suggestion)
    },
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
        // console.log(doc);
        // const targetList = [
        //   {
        //     "id": "validScopeMsgMap",
        //     "message": "当前正文需为宋体\n当前正文字号需为小四",
        //     "ruleId": null,
        //     "appearTimes": null,
        //     "errorWord": null,
        //     "originalTextPos": null,
        //     "severity": null,
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": null
        //   },
        //   {
        //     "id": "1",
        //     "message": "错别字：'路线图' 应为 '路线图'",
        //     "ruleId": "9",
        //     "appearTimes": "1",
        //     "errorWord": "路线图",
        //     "originalTextPos": {
        //       "from": 145,
        //       "to": 163
        //     },
        //     "severity": "warning",
        //     "fixCommand": {
        //       "action": "replaceText",
        //       "params": {
        //         "text": "路线图"
        //       }
        //     },
        //     "meta": {
        //       "section": "一、提前谋划部署，科学布局“路线图”"
        //     },
        //     "text": "一、提前谋划部署，科学布局“路线图”"
        //   },
        //   {
        //     "id": "2",
        //     "message": "错别字：'听心声' 应为 '听心声'",
        //     "ruleId": "9",
        //     "appearTimes": "1",
        //     "errorWord": "听心声",
        //     "originalTextPos": {
        //       "from": 612,
        //       "to": 630
        //     },
        //     "severity": "warning",
        //     "fixCommand": {
        //       "action": "replaceText",
        //       "params": {
        //         "text": "听心声"
        //       }
        //     },
        //     "meta": {
        //       "section": "三、深化多维访谈，问需于民“听心声”"
        //     },
        //     "text": "三、深化多维访谈，问需于民“听心声”"
        //   },
        //   {
        //     "id": "1",
        //     "message": "存在敏感词：国家",
        //     "ruleId": "4",
        //     "appearTimes": "1",
        //     "errorWord": "国家",
        //     "originalTextPos": {
        //       "from": 31,
        //       "to": 143
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "为准确掌握全省冬小麦返青期苗情动态，科学研判粮食生产形势，国家统计局山东调查总队抢抓农时、主动作为，紧扣冬小麦返青起身关键窗口期，在全省16市128个县（市、区），抽选1470个不同规模的种粮主体，全面开展苗情监测专题调研。"
        //   },
        //   {
        //     "id": "1",
        //     "message": "存在敏感词：路线",
        //     "ruleId": "4",
        //     "appearTimes": "1",
        //     "errorWord": "路线",
        //     "originalTextPos": {
        //       "from": 145,
        //       "to": 163
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "一、提前谋划部署，科学布局“路线图”"
        //   },
        //   {
        //     "id": "1",
        //     "message": "存在敏感词：计划",
        //     "ruleId": "4",
        //     "appearTimes": "1",
        //     "errorWord": "计划",
        //     "originalTextPos": {
        //       "from": 165,
        //       "to": 368
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "针对山东地域广阔、气候差异较大的特点，山东总队充分发挥粮食生产全过程监测机制优势，调研启动前周密准备、精准布局。一是精准把握调研窗口期。遵循冬小麦返青由南至北逐步推进的规律，合理安排调研时序，确保调研踩在节点上、落在关键处。二是科学制定实施方案。统筹考虑种植结构、地形地貌及历年生产情况，兼顾产粮大县与典型区域，细化完善调研计划与路线安排，明确调研内容、方法步骤和责任分工，推动调研工作靶向发力、有序推进。"
        //   },
        //   {
        //     "id": "2",
        //     "message": "存在敏感词：路线",
        //     "ruleId": "4",
        //     "appearTimes": "1",
        //     "errorWord": "路线",
        //     "originalTextPos": {
        //       "from": 165,
        //       "to": 368
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "针对山东地域广阔、气候差异较大的特点，山东总队充分发挥粮食生产全过程监测机制优势，调研启动前周密准备、精准布局。一是精准把握调研窗口期。遵循冬小麦返青由南至北逐步推进的规律，合理安排调研时序，确保调研踩在节点上、落在关键处。二是科学制定实施方案。统筹考虑种植结构、地形地貌及历年生产情况，兼顾产粮大县与典型区域，细化完善调研计划与路线安排，明确调研内容、方法步骤和责任分工，推动调研工作靶向发力、有序推进。"
        //   },
        //   {
        //     "id": "1",
        //     "message": "存在敏感词：进行",
        //     "ruleId": "4",
        //     "appearTimes": "1",
        //     "errorWord": "进行",
        //     "originalTextPos": {
        //       "from": 391,
        //       "to": 610
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "为全面提升苗情调研的客观性和精准度，总队坚持问题导向与目标导向相统一，推动现代信息技术与农业调查的深度融合。一是以遥感技术锁定重点区域。运用卫星遥感长势监测技术，对全省冬小麦返青情况进行宏观筛查，精准识别苗情异常地块，为实地调研提供靶向指引。二是以实地核查校准数据偏差。针对遥感监测发现的弱苗、受灾等疑似地块，组织专业力量开展现场核实，对比不同地块、品种、播期的苗情差异，科学评估整体长势，构建“天上看、地上察、数据核”的立体化监测体系。"
        //   },
        //   {
        //     "id": "2",
        //     "message": "存在敏感词：信息",
        //     "ruleId": "4",
        //     "appearTimes": "1",
        //     "errorWord": "信息",
        //     "originalTextPos": {
        //       "from": 391,
        //       "to": 610
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "为全面提升苗情调研的客观性和精准度，总队坚持问题导向与目标导向相统一，推动现代信息技术与农业调查的深度融合。一是以遥感技术锁定重点区域。运用卫星遥感长势监测技术，对全省冬小麦返青情况进行宏观筛查，精准识别苗情异常地块，为实地调研提供靶向指引。二是以实地核查校准数据偏差。针对遥感监测发现的弱苗、受灾等疑似地块，组织专业力量开展现场核实，对比不同地块、品种、播期的苗情差异，科学评估整体长势，构建“天上看、地上察、数据核”的立体化监测体系。"
        //   },
        //   {
        //     "id": "1",
        //     "message": "存在敏感词：多维",
        //     "ruleId": "4",
        //     "appearTimes": "1",
        //     "errorWord": "多维",
        //     "originalTextPos": {
        //       "from": 612,
        //       "to": 630
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "三、深化多维访谈，问需于民“听心声”"
        //   },
        //   {
        //     "id": "1",
        //     "message": "存在敏感词：管理",
        //     "ruleId": "4",
        //     "appearTimes": "2",
        //     "errorWord": "管理",
        //     "originalTextPos": {
        //       "from": 632,
        //       "to": 868
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "坚持既“察苗情”也“听民情”，采取“实地察看、现场走访、深入座谈、综合研判”的方式，与种植农户、辅助调查员、新型经营主体代表面对面交流。一是聚焦田间生产管理。详细了解返青水浇灌、化肥农药施用、生产投入成本及预期收益等情况，精准掌握农户在春季田间管理中面临的困难与问题。二是聚焦政策落地见效。结合农产品集贸市场价格、生产者价格及上年实产数据，与农业农村部门、农技专家深入座谈交流，详细了解惠农政策落实、农技服务、农资价格变动及农户种植意愿变化等情况，全方位研判粮食生产形势。"
        //   },
        //   {
        //     "id": "2",
        //     "message": "存在敏感词：政策",
        //     "ruleId": "4",
        //     "appearTimes": "2",
        //     "errorWord": "政策",
        //     "originalTextPos": {
        //       "from": 632,
        //       "to": 868
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "坚持既“察苗情”也“听民情”，采取“实地察看、现场走访、深入座谈、综合研判”的方式，与种植农户、辅助调查员、新型经营主体代表面对面交流。一是聚焦田间生产管理。详细了解返青水浇灌、化肥农药施用、生产投入成本及预期收益等情况，精准掌握农户在春季田间管理中面临的困难与问题。二是聚焦政策落地见效。结合农产品集贸市场价格、生产者价格及上年实产数据，与农业农村部门、农技专家深入座谈交流，详细了解惠农政策落实、农技服务、农资价格变动及农户种植意愿变化等情况，全方位研判粮食生产形势。"
        //   },
        //   {
        //     "id": "3",
        //     "message": "存在敏感词：价格",
        //     "ruleId": "4",
        //     "appearTimes": "3",
        //     "errorWord": "价格",
        //     "originalTextPos": {
        //       "from": 632,
        //       "to": 868
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "坚持既“察苗情”也“听民情”，采取“实地察看、现场走访、深入座谈、综合研判”的方式，与种植农户、辅助调查员、新型经营主体代表面对面交流。一是聚焦田间生产管理。详细了解返青水浇灌、化肥农药施用、生产投入成本及预期收益等情况，精准掌握农户在春季田间管理中面临的困难与问题。二是聚焦政策落地见效。结合农产品集贸市场价格、生产者价格及上年实产数据，与农业农村部门、农技专家深入座谈交流，详细了解惠农政策落实、农技服务、农资价格变动及农户种植意愿变化等情况，全方位研判粮食生产形势。"
        //   },
        //   {
        //     "id": "4",
        //     "message": "存在敏感词：代表",
        //     "ruleId": "4",
        //     "appearTimes": "1",
        //     "errorWord": "代表",
        //     "originalTextPos": {
        //       "from": 632,
        //       "to": 868
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "坚持既“察苗情”也“听民情”，采取“实地察看、现场走访、深入座谈、综合研判”的方式，与种植农户、辅助调查员、新型经营主体代表面对面交流。一是聚焦田间生产管理。详细了解返青水浇灌、化肥农药施用、生产投入成本及预期收益等情况，精准掌握农户在春季田间管理中面临的困难与问题。二是聚焦政策落地见效。结合农产品集贸市场价格、生产者价格及上年实产数据，与农业农村部门、农技专家深入座谈交流，详细了解惠农政策落实、农技服务、农资价格变动及农户种植意愿变化等情况，全方位研判粮食生产形势。"
        //   },
        //   {
        //     "id": "1",
        //     "message": "存在敏感词：信息",
        //     "ruleId": "4",
        //     "appearTimes": "2",
        //     "errorWord": "信息",
        //     "originalTextPos": {
        //       "from": 890,
        //       "to": 1091
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "在扎实掌握一手数据的基础上，总队深挖调研信息，强化定量分析与趋势研判，为保障粮食安全、促进农民增收提供坚实统计支撑。一是深化部门协同联动。加强与农业农村、气象、水利等部门的沟通协作，健全信息共享机制，会商研判生产形势。二是强化全程动态监测。紧盯小麦拔节、孕穗、灌浆等关键生育期，加密监测频次、扩大监测范围，持续跟踪苗情变化、气象灾害影响及病虫害发生发展情况，为粮食生产全过程提供更加精准的统计调查服务。"
        //   },
        //   {
        //     "id": "2",
        //     "message": "存在敏感词：安全",
        //     "ruleId": "4",
        //     "appearTimes": "1",
        //     "errorWord": "安全",
        //     "originalTextPos": {
        //       "from": 890,
        //       "to": 1091
        //     },
        //     "severity": "warning",
        //     "fixCommand": null,
        //     "meta": null,
        //     "text": "在扎实掌握一手数据的基础上，总队深挖调研信息，强化定量分析与趋势研判，为保障粮食安全、促进农民增收提供坚实统计支撑。一是深化部门协同联动。加强与农业农村、气象、水利等部门的沟通协作，健全信息共享机制，会商研判生产形势。二是强化全程动态监测。紧盯小麦拔节、孕穗、灌浆等关键生育期，加密监测频次、扩大监测范围，持续跟踪苗情变化、气象灾害影响及病虫害发生发展情况，为粮食生产全过程提供更加精准的统计调查服务。"
        //   }
        // ]
        // const result = targetList.map((item) => {
        //   const calcInfo = calculateErrorPosition(item);
        //   return {
        //     ...item,
        //     originalHitText: calcInfo?.originalHitText ?? '',
        //     notNeedFix: item.id === 'validScopeMsgMap', // 增加一个不需修复的标识
        //     btns: item.ruleId === '4' || item.id === 'validScopeMsgMap' ? ['confirmed'] : ['accepted', 'ignored'], // 传入按钮数组
        //     textPos: {
        //       from: calcInfo?.from,
        //       to: calcInfo?.to,
        //     },
        //     handleStatus: 'todo'
        //   }
        // });
        const result = [
          {
            "id": "leaderAuditDetection",
            "message": "待检测文本的主标题为'新闻媒体报道'，而审批件文本的主标题为'每日经济第7569期审核报告'",
            "ruleId": null,
            "appearTimes": null,
            "errorWord": null,
            "originalTextPos": null,
            "severity": "warning",
            "fixCommand": null,
            "meta": null,
            "text": null,
            "originalHitText": "",
            "btns": [
              "confirmed"
            ],
            "notNeedFix": true,
            "handleStatus": "todo"
          },
          {
            "id": "validScopeMsgMap",
            "message": "当前正文需为宋体\n当前正文字号需为小四",
            "ruleId": null,
            "appearTimes": null,
            "errorWord": null,
            "originalTextPos": null,
            "severity": "warning",
            "fixCommand": null,
            "meta": null,
            "text": null,
            "originalHitText": "",
            "notNeedFix": true,
            "btns": [
              "confirmed"
            ],
            "textPos": {},
            "handleStatus": "todo"
          },
          {
            "id": "20dzisbf41m",
            "message": "错别字：'本几构公关传媒部' 应为 '本机构公关传媒部'",
            "ruleId": "9",
            "appearTimes": "1",
            "errorWord": "本几构公关传媒部",
            "originalTextPos": {
              "from": 47,
              "to": 98
            },
            "severity": "warning",
            "fixCommand": {
              "action": "replaceText",
              "params": {
                "text": "本机构公关传媒部"
              }
            },
            "meta": {
              "section": "新闻媒体对研究简报的引用应该获得本几构公关传媒部的许可，但"
            },
            "text": "不损害本研究机构的知识产权和商业利益为前提。新闻媒体对研究简报的引用应该获得本几构公关传媒部的许可，但",
            "originalHitText": "本几构公关传媒部",
            "notNeedFix": false,
            "btns": [
              "accepted",
              "ignored"
            ],
            "textPos": {
              "from": 85,
              "to": 93
            },
            "handleStatus": "todo"
          },
          {
            "id": "8b5fuqafv3s",
            "message": "错别字：'究简报的观点不得对本研进行有悖原意的引用和修改。' 应为 '研究简报的观点不得对本研究进行有悖原意的引用和修改。'",
            "ruleId": "9",
            "appearTimes": "1",
            "errorWord": "究简报的观点不得对本研进行有悖原意的引用和修改。",
            "originalTextPos": {
              "from": 98,
              "to": 122
            },
            "severity": "warning",
            "fixCommand": {
              "action": "replaceText",
              "params": {
                "text": "研究简报的观点不得对本研究进行有悖原意的引用和修改。"
              }
            },
            "meta": {
              "section": "究简报的观点不得对本研进行有悖原意的引用和修改。"
            },
            "text": "究简报的观点不得对本研进行有悖原意的引用和修改。",
            "originalHitText": "究简报的观点不得对本研进行有悖原意的引用和修改。",
            "notNeedFix": false,
            "btns": [
              "accepted",
              "ignored"
            ],
            "textPos": {
              "from": 98,
              "to": 122
            },
            "handleStatus": "todo"
          },
          {
            "id": "m7g2yhr47cw",
            "message": "错别字：'我是一段有错别字的文字' 应为 '我是一段有正确字的文字'",
            "ruleId": "9",
            "appearTimes": "1",
            "errorWord": "我是一段有错别字的文字",
            "originalTextPos": {
              "from": 149,
              "to": 160
            },
            "severity": "warning",
            "fixCommand": {
              "action": "replaceText",
              "params": {
                "text": "我是一段有正确字的文字"
              }
            },
            "meta": {
              "section": "我是一段有错别字的文字"
            },
            "text": "我是一段有错别字的文字",
            "originalHitText": "我是一段有错别字的文字",
            "notNeedFix": false,
            "btns": [
              "accepted",
              "ignored"
            ],
            "textPos": {
              "from": 149,
              "to": 160
            },
            "handleStatus": "todo"
          },
          {
            "id": "qnuel6js3sw",
            "message": "存在敏感词：进行",
            "ruleId": "4",
            "appearTimes": "1",
            "errorWord": "进行",
            "originalTextPos": {
              "from": 98,
              "to": 122
            },
            "severity": "warning",
            "fixCommand": null,
            "meta": null,
            "text": "究简报的观点不得对本研进行有悖原意的引用和修改。",
            "originalHitText": "进行",
            "notNeedFix": false,
            "btns": [
              "confirmed"
            ],
            "textPos": {
              "from": 109,
              "to": 111
            },
            "handleStatus": "todo"
          },
          {
            "id": "n3qqtow0y80",
            "message": "存在敏感词：测试",
            "ruleId": "4",
            "appearTimes": "1",
            "errorWord": "测试",
            "originalTextPos": {
              "from": 135,
              "to": 144
            },
            "severity": "warning",
            "fixCommand": null,
            "meta": null,
            "text": "，我是测试文字一段",
            "originalHitText": "测试",
            "notNeedFix": false,
            "btns": [
              "confirmed"
            ],
            "textPos": {
              "from": 138,
              "to": 140
            },
            "handleStatus": "todo"
          }
        ]
        return Promise.resolve(result);
      }
    }
  },
})
setTimeout(() => {
  if (isYkxDev) {
    const tiptapEditor = editorRef.value?.useEditor?.()
    const documentSuggestStorage = (tiptapEditor as any)?.storage?.documentSuggest
    if (documentSuggestStorage) {
      documentSuggestStorage.ignoreDirtyDepth = (documentSuggestStorage.ignoreDirtyDepth ?? 0) + 1
    }
    try {
      editorRef.value?.setContent('<p style="text-align: center;"><span style="font-family: &quot;Calibri Light&quot;; font-size: 16pt;">新闻媒体报道</span></p><p style="text-align: left;text-indent: 32pt;"><span style="font-family: Calibri; font-size: 12pt;">新闻媒体基于学术研究和观点讨论而对本研究简报的引用受到鼓励，但这种引用必须以</span><span style="font-family: Calibri; font-size: 15pt;">不损害本研究机构的知识产权和商业利益为前提。新闻媒体对研究简报的引用应该获得本几构公关传媒部的许可，但</span><span style="font-family: Calibri; font-size: 12pt;">究简报的观点不得对本研进行有悖原意的引用和修改。</span></p><p style="text-align: left;"><span style="font-family: Calibri; font-size: 12pt;">我是一段策试文字111，我是测试文字一段222</span></p><p><span style="font-family: Calibri; font-size: 12pt;">我是一段有错别字的问字</span></p><p><br></p><p></p>', { focusPostion: null });
    } finally {
      queueMicrotask(() => {
        if (documentSuggestStorage) {
          documentSuggestStorage.ignoreDirtyDepth = Math.max(0, (documentSuggestStorage.ignoreDirtyDepth ?? 0) - 1)
        }
      })
    }
  }

}, 1000)


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