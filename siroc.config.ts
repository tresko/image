import VuePlugin from 'rollup-plugin-vue'

export default {
  hooks: {
    'build:extendRollup' (_, { rollupConfig }) {
      const cfg = rollupConfig.find(cfg => cfg.input.includes('src/runtime/index'))
      cfg.plugins.push(VuePlugin())
    }
  }
}
