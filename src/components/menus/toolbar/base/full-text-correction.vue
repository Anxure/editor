<template>
  <menus-button
    :text="t('base.fullTextCorrection')"
    ico="text-collect"
    :tooltip="t('base.fullTextCorrection')"
    huge
    @menu-click="handleFullTextCorrection()"
  />
</template>
<!-- v-if="options.document?.enableMarkdown" -->

<script setup lang="ts">
const handleFullTextCorrection = () => {
  console.log('handleFullTextCorrection')
}
</script>
