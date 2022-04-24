module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js}',
  ],
  theme: {
    extend: {
      colors: {
        splatoon: {
          yellow: '#eefe65',
          blue: '#5b3df5',
        },
      },
      fontFamily: {
        splatoon1: ['Splatoon1', 'sans-serif'],
        splatoon2: ['Splatoon2', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
