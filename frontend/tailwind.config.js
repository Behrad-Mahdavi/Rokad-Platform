/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // Semantic Brand Aliases
        primary: {
          DEFAULT: '#59BBAF',
          hover: '#50A89E',
          active: '#47968C',
          light: '#EEF8F7',
          dark: '#438C83',
          darker: '#1F413D',
        },
        girl: {
          DEFAULT: '#E0195B',
          hover: '#CA1752',
          active: '#B31449',
          light: '#FCE8EF',
          dark: '#A81344',
          darker: '#4E0920',
        },
        third: {
          DEFAULT: '#F8A41D',
          hover: '#DF941A',
          active: '#C68317',
          light: '#FEF6E8',
          dark: '#BA7B16',
          darker: '#57390A',
        },
        sec: {
          DEFAULT: '#202A5A',
          hover: '#1D2651',
          active: '#1A2248',
          light: '#E9EAEF',
          dark: '#182044',
          darker: '#0B0F1F',
        },

        // 5 Personas Spectrum
        ecosystem: {
          light: '#EEF8F7',
          'light-hover': '#E6F5F3',
          'light-active': '#CCEAE6',
          normal: '#59BBAF',
          'normal-hover': '#50A89E',
          'normal-active': '#47968C',
          dark: '#438C83',
          'dark-hover': '#357069',
          'dark-active': '#28544F',
          darker: '#1F413D',
        },
        male: {
          light: '#E9EAEF',
          'light-hover': '#DEDFE6',
          'light-active': '#BABDCC',
          normal: '#202A5A',
          'normal-hover': '#1D2651',
          'normal-active': '#1A2248',
          dark: '#182044',
          'dark-hover': '#131936',
          'dark-active': '#0E1328',
          darker: '#0B0F1F',
        },
        female: {
          light: '#FCE8EF',
          'light-hover': '#FADDE6',
          'light-active': '#F5B8CC',
          normal: '#E0195B',
          'normal-hover': '#CA1752',
          'normal-active': '#B31449',
          dark: '#A81344',
          'dark-hover': '#860F37',
          'dark-active': '#650B29',
          darker: '#4E0920',
        },
        college: {
          light: '#FEF6E8',
          'light-hover': '#FEF1DD',
          'light-active': '#FDE3B9',
          normal: '#F8A41D',
          'normal-hover': '#DF941A',
          'normal-active': '#C68317',
          dark: '#BA7B16',
          'dark-hover': '#956211',
          'dark-active': '#704A0D',
          darker: '#57390A',
        },
        club: {
          light: '#F0EAF4',
          'light-hover': '#E8E0EE',
          'light-active': '#CFBEDD',
          normal: '#652D90',
          'normal-hover': '#5B2982',
          'normal-active': '#512473',
          dark: '#4C226C',
          'dark-hover': '#3D1B56',
          'dark-active': '#2D1441',
          darker: '#231032',
        },
        ink: {
          light: '#EAEAE9',
          'light-hover': '#DFDFDF',
          'light-active': '#BDBCBC',
          normal: '#292827',
          'normal-hover': '#252423',
          'normal-active': '#21201F',
          dark: '#1F1E1D',
          darker: '#0E0E0E',
        },

        // Dynamic Accent and Status Colors
        accent: {
          green: '#009966',
          red: '#C60036',
          purple: '#8A38F5',
        },
      },
      fontFamily: {
        sans: ['IRANSansXFaNum', 'IRANSansX', 'sans-serif'],
        mono: ['IRANSansXFaNum', 'IRANSansX', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.125rem' }],   // 12px / 18px
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],  // 13px / 20px
        base: ['0.875rem', { lineHeight: '1.375rem' }],// 14px / 22px
        md: ['0.9375rem', { lineHeight: '1.4375rem' }],// 15px / 23px
        lg: ['1rem', { lineHeight: '1.5rem' }],        // 16px / 24px
        xl: ['1.125rem', { lineHeight: '1.625rem' }],  // 18px / 26px
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px / 28px
        '3xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px / 32px
        '4xl': ['1.75rem', { lineHeight: '2.25rem' }],  // 28px / 36px
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        pill: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        // Rokad Brand Hard Shadows (No blur, 2.75px offset)
        'brand-ecosystem': '2.75px 2.75px 0 #59BBAF',
        'brand-male': '2.75px 2.75px 0 #202A5A',
        'brand-female': '2.75px 2.75px 0 #E0195B',
        'brand-college': '2.75px 2.75px 0 #F8A41D',
        'brand-club': '2.75px 2.75px 0 #652D90',
        'brand-neutral': '2.75px 2.75px 0 #292827',
        'brand-white': '2.75px 2.75px 0 rgba(255, 255, 255, 0.4)',
      },
    },
  },
  plugins: [],
};
