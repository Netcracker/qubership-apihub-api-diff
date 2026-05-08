import * as path from 'path'
import { defineConfig, Plugin } from 'vite'
import dts from 'vite-plugin-dts'
import pkg from './package.json'
import { load as loadYaml } from 'js-yaml'

function yamlPlugin(): Plugin {
  return {
    name: 'yaml',
    transform(code, id) {
      if (!id.endsWith('.yaml') && !id.endsWith('.yml')) return null
      const data = loadYaml(code)
      return { code: `export default ${JSON.stringify(data)}`, map: null }
    },
  }
}

export default defineConfig({
  plugins: [
    yamlPlugin(),
    dts({
      insertTypesEntry: true,
      tsconfigPath: path.resolve(__dirname, 'tsconfig.build.json'),
    }),
  ],
  build: {
    rollupOptions: {
      external: Object.keys(pkg.dependencies),
    },
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      fileName: (format) => `index.${format}.js`,
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
    },
  },
})
