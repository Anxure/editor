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
  } as import('vite').LibraryOptions,
  outDir: 'dist',
  copyPublicDir: false,
  minify: 'esbuild' as const,
  cssMinify: true,
  rollupOptions: {
    output: [
      {
        format: 'es' as const,
        banner: copyright,
        intro: `import './style.css'`,
      },
    ],
    // vue 必须 external；同时将体积较大的依赖 external，避免 full bundle 过大
    external: ['vue'],
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
