// Jest transform for *.yaml files — parses YAML content and exposes it as a
// CommonJS default export so that `import rules from '*.yaml'` works in tests.
const yaml = require('js-yaml')

module.exports = {
  process(content) {
    return {
      code: `module.exports = ${JSON.stringify(yaml.load(content))}`,
    }
  },
}
