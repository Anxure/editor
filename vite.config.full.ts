import Vue from '@vitejs/plugin-vue'
import ReactivityTransform from '@vue-macros/reactivity-transform/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TDesignResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import VueMacros from 'unplugin-vue-macros/vite'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import tsConfigPaths from 'vite-tsconfig-paths'
import { visualizer } from 'rollup-plugin-visualizer'
import copyright from './src/utils/copyright'

// Plugin configurations
const vuePlugins = {
  VueMacros: VueMacros({
    plugins: {
      vue: Vue(),
    },
  }),
  AutoImport: AutoImport({
    dirs: ['./src/composables'],
    imports: ['vue', '@vueuse/core'],
    resolvers: [TDesignResolver({ library: 'vue-next', esm: true })],
    dts: './types/imports.d.ts',
  }),
  Components: Components({
    directoryAsNamespace: true,
    dirs: ['./src/components'],
    resolvers: [TDesignResolver({ library: 'vue-next', esm: true })],
    dts: './types/components.d.ts',
  }),
  SvgIcons: createSvgIconsPlugin({
    iconDirs: [`${process.cwd()}/src/assets/icons`],
    symbolId: 'umo-icon-[name]',
    customDomId: 'umo-icons',
  }),
}

// Full-bundle build configuration - 尽量减少外部依赖，但对体积较大的三方库做 external 以控制 bundle 体积
const buildConfig: import('vite').BuildOptions = {
  target: 'esnext',
  lib: {
    entry: `${process.cwd()}/src/components/index.ts`,
    // UMD / IIFE 全局变量名：window.UmoEditor
    name: 'UmoEditor',
    fileName: 'umo-editor',
    /**
     * 代码拆分构建不支持 UMD/IIFE（Rollup 限制），这里显式只输出 ESM。
     */
    formats: ['es'],
  } as import('vite').LibraryOptions,
  outDir: 'dist',
  copyPublicDir: false,
  minify: 'esbuild' as const,
  cssMinify: true,
  rollupOptions: {
    output: {
      format: 'es' as const,
      banner: copyright,
      intro: `import './style.css'`,
      /**
       * 允许生成多个 chunk（否则 Rollup 会强制把动态 import 内联，导致只能输出单文件）。
       * 这能显著降低首屏 JS 解析/执行压力，提升加载体验。
       */
      inlineDynamicImports: false,
      // chunkFileNames: 'chunks/[name]-[hash].js',
      // assetFileNames: 'assets/[name]-[hash][extname]',
      /**
       * 按项目依赖分组拆包：不要求使用方额外安装这些依赖（它们会被打进 dist 的多个 chunk）。
       */
      manualChunks(id) {
        if (!id.includes('node_modules')) return undefined

        if (id.includes('tdesign-vue-next')) return 'tdesign'
        if (id.includes('mermaid')) return 'mermaid'
        if (id.includes('onnxruntime-web')) return 'onnx'
        if (id.includes('@umoteam/viewer')) return 'viewer'
        if (id.includes('katex')) return 'katex'
        return 'vendor'
      },
    },
    // 仅 vue external（其余依赖全部打包进来），使用方无需额外安装依赖（除 Vue）
    external: ['vue'],
    plugins: [
      visualizer({
        filename: 'dist/stats.html', // 输出文件
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // 也可以用 'sunburst' / 'network'
      }),
    ],
  },
}

const cssConfig = {
  preprocessorOptions: {
    less: {
      modifyVars: { '@prefix': 'umo' },
      javascriptEnabled: true,
      plugins: [
        {
          install(less: any, pluginManager: any) {
            pluginManager.addPostProcessor({
              process(css: string) {
                return css.replace(/\.flex-center(\s|\{|,)[^}]*\}/g, '')
              },
            })
          },
        },
      ],
    },
  },
}

export default defineConfig({
  base: '/umo-editor',
  plugins: [
    tsConfigPaths(),
    dts({
      outDir: 'types',
      include: [
        'src/components/{index,modal,tooltip}.{ts,vue}',
        'src/components/menus/button.vue',
      ],
      bundledPackages: [
        'vue',
        '@vue/runtime-core',
        '@vue/compiler-sfc',
        '@tiptap/vue-3',
        '@tiptap/core',
      ],
      exclude: ['src/extensions/**/*'],
      logLevel: 'silent',
      pathsToAliases: true,
      compilerOptions: {
        skipDiagnostics: false,
        logDiagnostics: true,
      },
      beforeWriteFile: (filePath, content) => {
        const correctedContent = content.replace(
          /from ['"]\.\.\/types['"]/g,
          "from '../../../types'",
        )
        return {
          filePath,
          content: correctedContent,
        }
      },
    }),
    ReactivityTransform(),
    ...Object.values(vuePlugins),
  ],
  css: cssConfig,
  build: buildConfig,
  esbuild: {
    drop: ['debugger'],
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': `${process.cwd()}/src`,
    },
  },
})
