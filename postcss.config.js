module.exports = process.env.VITEST
  ? { plugins: {} }
  : {
      plugins: {
        '@tailwindcss/postcss': {},
      },
    }
