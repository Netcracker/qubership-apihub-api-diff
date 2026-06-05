module.exports = {
  testEnvironment: 'node',
  testTimeout: 100000,
  transform: {
    // importHelpers:false (inline TS helpers instead of importing from tslib).
    // ddlapi is compiled from source (see moduleNameMapper) and does not ship
    // tslib, so importing helpers from it fails to resolve; inlining sidesteps
    // that without affecting runtime behaviour.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { importHelpers: false } }],
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/',
  ],
  testRegex: '(/test/.*(\\.|/)(test|spec))\\.(ts?|tsx?|js?|jsx?)$',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
  ],
  moduleNameMapper: {
    // ddlapi is consumed from source in tests: its bundled `dist` ships an
    // emscripten (libpg-query) WASM loader whose `require('fs')` is mangled by
    // the bundler and aborts under Node (`P.readFileSync is not a function`).
    // ddlapi's own jest config maps the package to source for the same reason;
    // loading source lets pgsql-parser initialise the WASM the way it does there.
    '^@netcracker/qubership-apihub-ddlapi$': '<rootDir>/../ddlapi/src/index.ts',
    // The other workspace packages are consumed from their linked dist builds
    // and can be remapped to source here if ever needed:
    //    "^@netcracker/qubership-apihub-api-unifier$":'<rootDir>/../api-unifier/src',
    //    "^@netcracker/qubership-apihub-json-crawl$":'<rootDir>/../json-crawl/src',
    //    "^@netcracker/qubership-apihub-graphapi$":'<rootDir>/../graphapi/src',
  },
  setupFilesAfterEnv: [
    'jest-extended/all',
    '<rootDir>/test/setup/jest-wrappers.ts',
  ],
}
