module.exports = {
  require: jest.fn(),
  match: jest.fn(),
  app: jest.fn(),
  remote: {
    app: {
      getPath: (p) => `test/${p}`
    },
    process: {
      env: jest.fn()
    }
  },
  dialog: jest.fn()
}
