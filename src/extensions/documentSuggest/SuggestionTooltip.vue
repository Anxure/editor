<template>
    <template v-if="element && suggestion">
        <teleport :to="element.element">
            <span :key="element.element" ref="reference" />
        </teleport>
        <div
          v-if="isOpen"
          class="suggestion-tooltip-parent"
          ref="floating"
          data-suggestion-tooltip="true"
          :style="{...floatingStyles, zIndex: 100}"
        >
            <div class="suggestion-tooltip">
                <div class="top">
                    <t-tooltip
                      :attach="popupAttach"
                      trigger="hover"
                      placement="left"
                      :disabled="!suggestion?.message"
                    >
                      <div
                        :class="[
                          'replacement-option',
                          'suggestion-message',
                          suggestion.severity === 'error'
                            ? 'error'
                            : suggestion.severity === 'warning'
                              ? 'warning'
                              : 'info',
                        ]"
                      >
                      {{ suggestion.message }}
                      </div>
                      <template #content>
                        <div class="suggestion-message-popup">
                          {{ suggestion.message }}
                        </div>
                      </template>
                    </t-tooltip>
                    <div class="button-group">
                        <button v-if="suggestion.btns.includes('accepted')" @click="applySuggestion(suggestion.id)">修复</button>
                        <button v-if="suggestion.btns.includes('ignored')" class="destructive" @click="rejectSuggestion(suggestion.id)">忽略</button>
                        <button v-if="suggestion.btns.includes('confirmed')" @click="confirmSuggestion(suggestion.id)">确认</button>
                    </div>
                </div>
                <div class="bottom">
                    <p class="label-small">{{ element.ruleTitle }}</p>
                </div>
            </div>
        </div>
    </template>
</template>

<script setup lang="ts">
import { offset, shift, useFloating } from '@floating-ui/vue'
// ts-ignore
// import { ref, computed } from 'vue'
const props = defineProps({
    element: {
        type: Object,
        default: null,
    },
    editor: {
        type: Object,
        required: true,
    },
})
const reference = ref(null)
const floating = ref(null)
const suggestion = computed(() => props.element?.suggestion)
const popupAttach = computed(() => {
    const container = props.editor?.storage?.container
    return container ? `${container} .umo-zoomable-container` : 'body'
})
const isOpen = computed(() =>
    Boolean(props.element && props.element.suggestion && suggestion?.value?.id)
)
const { floatingStyles } = useFloating(reference, floating, {
    placement: 'bottom',
    middleware: [offset(8), shift({ padding: 8 })],
})

// const { previousWord } = getPreviousWord(props.editor, suggestion.value?.deleteRange.from)
// const { nextWord, punctuationMark } = getNextWord(props.editor, suggestion.value?.deleteRange.to)

const applySuggestion = (suggestionId: string) => {
    props.editor
        .chain()
        .applySuggestion(suggestionId)
        .focus()
        .run()
}

const rejectSuggestion = (suggestionId: string) => {
    props.editor.chain().rejectSuggestion(suggestionId).focus().run()
}

const confirmSuggestion = (suggestionId: string) => {
    props.editor.chain().confirmSuggestion(suggestionId).focus().run()
}

</script>
<style lang="css">
:root {
    --white: #fff;
    --black: #2e2b29;
    --black-contrast: #110f0e;
    --gray-1: rgba(61, 37, 20, .05);
    --gray-2: rgba(61, 37, 20, .08);
    --gray-3: rgba(61, 37, 20, .12);
    --gray-4: rgba(53, 38, 28, .3);
    --gray-5: rgba(28, 25, 23, .6);
    --green: #22c55e;
    --purple: #6a00f5;
    --purple-contrast: #5800cc;
    --purple-light: rgba(88, 5, 255, .05);
    --yellow-contrast: #facc15;
    --yellow: rgba(250, 204, 21, .4);
    --yellow-light: #fffae5;
    --red: #ff5c33;
    --red-light: #ffebe5;
    --red-light-contrast: #ffd6cc;
    --shadow: 0px 12px 33px 0px rgba(0, 0, 0, .06), 0px 3.618px 9.949px 0px rgba(0, 0, 0, .04);
}
</style>
<style scoped lang="less">
.suggestion-tooltip {
    width: 326px;
    background-color: #fff;
    box-shadow: 0 .54px 1.49px #00000005, 0 1.5px 4.13px #00000008, 0 3.62px 9.95px #0000000a, 0 12px 20px #0000000f;
    border-radius: .5rem;
    overflow: hidden
}

.suggestion-tooltip .top {
    padding: .5rem 1rem
}

.suggestion-message {
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
}

.suggestion-message-popup {
    max-width: 360px;
}



.suggestion-tooltip .top .replacement-option {
    font-size: 14px;
    font-weight: 400;
    color: var(--black);
    margin-bottom: 10px;
}

.suggestion-tooltip .top .replacement-option .text .add-text {
    background-color: var(--ai-suggestion-background-color)
}

.suggestion-tooltip .top .destructive {
    background-color: #ffebe5;
}

.suggestion-tooltip .top .destructive:hover {
    background-color: var(--red-light-contrast)
}



.suggestion-tooltip .bottom .label-small {
    margin: 0;
    line-height: 1.2;
    color: var(--gray-5)
}

.suggestion-tooltip-parent {
    padding-bottom: .5rem
}

.suggestion-tooltip .button-group {
    display: flex;
    gap: .5rem;
}

.suggestion-tooltip .bottom {
    padding: .5rem 1rem;
    padding: .5rem 1rem;
    background-color: rgba(61, 37, 20, .05);
}

.label-small {
    color: rgba(28, 25, 23, .6);
    font-size: .75rem;
    font-weight: 400;
    line-height: 1.2
}

button {
    cursor: pointer;
    background: rgba(61, 37, 20, .08);
    border-radius: .5rem;
    border: none;
    color: #333;
    font-family: inherit;
    font-size: .875rem;
    font-weight: 500;
    line-height: 1.15;
    margin: none;
    padding: .375rem .625rem;
    transition: all .2s cubic-bezier(.65, .05, .36, 1);
}

button:hover {
    background: var(--gray-3);
    color: var(--black-contrast);
}

button:active {
    background: var(--gray-3);
    color: var(--black-contrast);
}
</style>