const plugin = require("tailwindcss/plugin");

module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js}',
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
            league: '#f02d7d',
          },
        },
      },
      fontFamily: {
        splatoon1: ['Splatoon1', 'sans-serif'],
        splatoon2: ['Splatoon2', 'sans-serif'],
      },
    },
  },
  plugins: [
    plugin(function({ addVariant }) {
      addVariant('ss', 'body.for-screenshots &')
    })
  ]
}
