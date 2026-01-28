import { heroui } from '@heroui/react'

export default heroui({
  themes: {
    light: {
      extend: 'light',
      colors: {
        default: { DEFAULT: '#E6E3DE', foreground: '#423E39' },
        primary: { DEFAULT: '#E8702A', foreground: '#FFFAF5' },
        secondary: { DEFAULT: '#E3EDE6', foreground: '#3C4D44' },
        success: { DEFAULT: '#9db787', foreground: '#000000' },
        warning: { DEFAULT: '#ffd25f', foreground: '#000000' },
        danger: { DEFAULT: '#E85D4E', foreground: '#FFFAF5' },
        background: '#FFFAF5',
        foreground: '#423E39',
        content1: { DEFAULT: '#FFFCFA', foreground: '#423E39' },
        content2: { DEFAULT: '#F7F4F0', foreground: '#423E39' },
        content3: { DEFAULT: '#F2EFE9', foreground: '#423E39' },
        content4: { DEFAULT: '#EBE8E3', foreground: '#423E39' },
        focus: '#E8702A',
        overlay: '#FFFAF5',
      },
    },
    dark: {
      extend: 'dark',
      colors: {
        default: { DEFAULT: '#413841', foreground: '#ffffff' },
        primary: { DEFAULT: '#db924b', foreground: '#000000' },
        secondary: { DEFAULT: '#5a8486', foreground: '#ffffff' },
        success: { DEFAULT: '#9db787', foreground: '#000000' },
        warning: { DEFAULT: '#ffd25f', foreground: '#000000' },
        danger: { DEFAULT: '#fc9581', foreground: '#000000' },
        background: '#20161F',
        foreground: '#c59f60',
        content1: { DEFAULT: '#2c1f2b', foreground: '#ffffff' },
        content2: { DEFAULT: '#3e2b3c', foreground: '#ffffff' },
        content3: { DEFAULT: '#50374d', foreground: '#ffffff' },
        content4: { DEFAULT: '#62435f', foreground: '#ffffff' },
        focus: '#db924b',
        overlay: '#000000',
      },
    },
  },
})
