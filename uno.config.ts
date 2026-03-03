import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  shortcuts: {
    'btn': 'px-4 py-2 rounded font-semibold cursor-pointer transition-all duration-200',
    'btn-primary': 'btn bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90',
    'btn-secondary': 'btn bg-gray-200 text-gray-700 hover:bg-gray-300',
    'card': 'bg-white rounded-lg shadow-sm p-4',
    'input': 'px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500',
  },
  theme: {
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
    },
  },
})
