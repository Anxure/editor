<template>
  <menus-button text="Word" ico="word" huge @menu-click="exportWord" />
</template>

<script setup lang="ts">
const exportWord = inject('exportWord')
</script>

<style lang="less" scoped></style>
