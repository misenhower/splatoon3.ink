const plugin = require("tailwindcss/plugin");

module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,mjs}',
  ],
  theme: {
    extend: {
      colors: {
        splatoon: {
          blue: '#603bff',
          purple: '#af50ff',
          yellow: '#eaff3d',
          green: '#6af7ce',
          orange: '#ff9750',
          red: '#ff505e',
          brown: '#7f413f',

          battle: {
            regular: '#19d719',
            ranked: '#f54910',
            xmatch: '#0fdb9b',
            league: '#f02d7d',
          },

          salmonRun: '#ff5600',
          bigRun: '#b322ff',
          eggstraWork: '#be8800',
        },
      },
      fontFamily: {
        splatoon1: 'var(--font-family-s1)',
        splatoon2: 'var(--font-family-s2)',
      },
      dropShadow: {
        'ruleIcon': '1px 1px 0 rgb(0,0,0)',
      },
    },
  },
  plugins: [
    plugin(function({ addVariant }) {
      addVariant('mobile', 'body.is-mobile &');
      addVariant('ss', 'body.for-screenshots &');
    }),
  ],
}
