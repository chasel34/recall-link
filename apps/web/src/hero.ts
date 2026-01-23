import { heroui } from '@heroui/react'

export default heroui({
  themes: {
    light: {
      extend: 'light',
      colors: {
        default: { DEFAULT: '#b4afa8', foreground: '#000000' },
        primary: { DEFAULT: '#db924b', foreground: '#000000' },
        secondary: { DEFAULT: '#5a8486', foreground: '#ffffff' },
        success: { DEFAULT: '#9db787', foreground: '#000000' },
        warning: { DEFAULT: '#ffd25f', foreground: '#000000' },
        danger: { DEFAULT: '#fc9581', foreground: '#000000' },
        background: '#fffbf6',
        foreground: '#a27225',
        content1: { DEFAULT: '#fff2e0', foreground: '#20161F' },
        content2: { DEFAULT: '#ffe9cc', foreground: '#20161F' },
        content3: { DEFAULT: '#ffe0b8', foreground: '#20161F' },
        content4: { DEFAULT: '#ffd7a3', foreground: '#20161F' },
        focus: '#db924b',
        overlay: '#ffffff',
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
