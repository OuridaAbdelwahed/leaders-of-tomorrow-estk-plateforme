'use client';

import { createTheme, ThemeProvider } from '@mui/material';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

type ColorMode = 'light' | 'dark';

const ColorModeContext = createContext<{ mode: ColorMode; toggleMode: () => void }>({
  mode: 'light' as ColorMode,
  toggleMode: () => undefined,
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem('lot-color-mode');
    const preferred = stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const frame = window.requestAnimationFrame(() => setMode(preferred));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    window.localStorage.setItem('lot-color-mode', mode);
  }, [mode]);

  const colorMode = useMemo(() => ({
    mode,
    toggleMode: () => setMode((current) => current === 'light' ? 'dark' : 'light'),
  }), [mode]);

  const theme = useMemo(() => createTheme({
    cssVariables: true,
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#63C9C5' : '#326D7B', dark: '#234D56', contrastText: mode === 'dark' ? '#07191E' : '#FFFFFF' },
      secondary: { main: '#C59008', dark: '#936B00', contrastText: '#111111' },
      background: { default: mode === 'dark' ? '#07191E' : '#F6F8F8', paper: mode === 'dark' ? '#0C252B' : '#FFFFFF' },
      text: { primary: mode === 'dark' ? '#F3F8F8' : '#13272C', secondary: mode === 'dark' ? '#A9BEC2' : '#50666C' },
      success: { main: '#277A55' }, error: { main: '#B3261E' },
    },
    shape: { borderRadius: 18 },
    typography: {
      fontFamily: 'var(--font-ui), Roboto, Arial, sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1.04 },
      h2: { fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.08 },
      h3: { fontWeight: 650, letterSpacing: '-0.025em' },
      button: { fontWeight: 700, textTransform: 'none', letterSpacing: 0 },
      body1: { lineHeight: 1.65 }, body2: { lineHeight: 1.55 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 46, paddingInline: 20, cursor: 'pointer', overflow: 'hidden', isolation: 'isolate',
            borderRadius: 'var(--shape-control)', borderStartEndRadius: 'var(--shape-control-cut)',
            transition: 'transform var(--motion-control), border-radius var(--motion-control), background-color var(--motion-control), border-color var(--motion-control), color var(--motion-control), box-shadow var(--motion-control)',
            '& .MuiButton-startIcon, & .MuiButton-endIcon': { transition: 'transform var(--motion-control)' },
            '&:hover': {
              borderRadius: 'var(--shape-control)', borderStartStartRadius: 'var(--shape-control-cut)', borderStartEndRadius: 'var(--shape-control)',
              transform: 'translateY(-2px)',
              '& .MuiButton-startIcon, & .MuiButton-endIcon': { transform: 'scale(1.07)' },
            },
            '&:active': { transform: 'translateY(1px) scale(.985)' },
            '&.Mui-disabled': { cursor: 'default', transform: 'none', boxShadow: 'none' },
          },
          sizeSmall: { minHeight: 44, paddingInline: 16 },
          sizeLarge: { minHeight: 50, paddingInline: 24 },
          contained: {
            position: 'relative', boxShadow: 'var(--shadow-action)',
            '&::before': {
              content: '""', position: 'absolute', zIndex: -1, width: 48, aspectRatio: '1', insetInlineEnd: -31, bottom: -31,
              borderRadius: '58% 42% 54% 46% / 44% 58% 42% 56%', background: 'rgba(245,188,35,.26)', pointerEvents: 'none',
              transform: 'rotate(-12deg) scale(.72)', opacity: .8, transition: 'transform var(--motion-control), opacity var(--motion-control)',
            },
            '&:hover': { boxShadow: '0 15px 30px rgba(8,36,42,.24), 6px 6px 0 rgba(245,188,35,.28)' },
            '&:hover::before': { transform: 'rotate(8deg) scale(1.28)', opacity: 1 },
            '&:active': { boxShadow: '0 4px 10px rgba(8,36,42,.16)' },
          },
          outlined: {
            position: 'relative', borderColor: 'rgba(50,109,123,.42)', boxShadow: 'var(--shadow-control)',
            '&::before': {
              content: '""', position: 'absolute', zIndex: -1, width: 46, aspectRatio: '1', insetInlineEnd: -30, bottom: -30,
              borderRadius: '58% 42% 54% 46% / 44% 58% 42% 56%', background: 'rgba(50,109,123,.12)', pointerEvents: 'none',
              transform: 'rotate(-12deg) scale(.72)', opacity: .75, transition: 'transform var(--motion-control), opacity var(--motion-control)',
            },
            '&:hover': { borderColor: '#326D7B', background: 'rgba(50,109,123,.06)', boxShadow: 'var(--shadow-control-hover)' },
            '&:hover::before': { transform: 'rotate(8deg) scale(1.28)', opacity: 1 },
            '&:active': { boxShadow: '0 4px 10px rgba(8,36,42,.12)' },
          },
          text: {
            minHeight: 42, paddingInline: 14, boxShadow: 'none',
            '&:hover': { background: 'rgba(50,109,123,.065)', boxShadow: 'none' },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            width: 44, height: 44, minWidth: 44, minHeight: 44, cursor: 'pointer',
            borderRadius: '14px', borderStartEndRadius: '5px',
            transition: 'transform var(--motion-control), border-radius var(--motion-control), background-color var(--motion-control), color var(--motion-control), box-shadow var(--motion-control)',
            '&:hover': { borderRadius: '14px', borderStartStartRadius: '5px', borderStartEndRadius: '14px', transform: 'translateY(-1px)', background: 'rgba(50,109,123,.08)', boxShadow: '0 8px 18px rgba(8,36,42,.11)' },
            '&:active': { transform: 'translateY(1px) scale(.94)', boxShadow: 'none' },
            '&.Mui-disabled': { cursor: 'default', transform: 'none', boxShadow: 'none' },
          },
        },
      },
      MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true, size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 48, background: mode === 'dark' ? '#0C252B' : '#FFFFFF',
            borderRadius: 'var(--shape-control)', borderStartEndRadius: 'var(--shape-control-cut)',
            transition: 'border-radius var(--motion-control), background-color var(--motion-control), box-shadow var(--motion-control)',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(50,109,123,.28)', transition: 'border-color var(--motion-control), border-width var(--motion-control)' },
            '&:hover': { background: mode === 'dark' ? '#102F36' : '#FCFEFE', borderRadius: 'var(--shape-control)', borderStartStartRadius: 'var(--shape-control-cut)', borderStartEndRadius: 'var(--shape-control)', boxShadow: '0 7px 18px rgba(8,36,42,.07)' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#48808F' },
            '&.Mui-focused': { borderRadius: 'var(--shape-control)', borderStartStartRadius: 'var(--shape-control-cut)', borderStartEndRadius: 'var(--shape-control)', boxShadow: '0 0 0 3px rgba(50,109,123,.14), 5px 6px 0 rgba(245,188,35,.1)' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#326D7B', borderWidth: 1.5 },
            '&.Mui-error.Mui-focused': { boxShadow: '0 0 0 3px rgba(179,38,30,.12), 5px 6px 0 rgba(179,38,30,.07)' },
            '&.Mui-disabled': { background: mode === 'dark' ? '#10272D' : '#EEF2F2', boxShadow: 'none' },
          },
          input: { padding: '12px 14px', fontSize: '.95rem', lineHeight: 1.45 },
          multiline: { padding: '12px 14px', alignItems: 'flex-start' },
        },
      },
      MuiInputLabel: { styleOverrides: { root: { color: mode === 'dark' ? '#A9BEC2' : '#5D7278', fontSize: '.94rem', fontWeight: 650, '&.Mui-focused': { color: mode === 'dark' ? '#63C9C5' : '#326D7B' } } } },
      MuiFormHelperText: { styleOverrides: { root: { marginTop: 6, marginInline: 4, lineHeight: 1.45 } } },
      MuiInputAdornment: { styleOverrides: { root: { color: mode === 'dark' ? '#A9BEC2' : '#5D7278', '& .MuiSvgIcon-root': { fontSize: 21 }, '& .MuiIconButton-root': { width: 40, height: 40, minWidth: 40, minHeight: 40 } } } },
      MuiSelect: { styleOverrides: { select: { paddingBlock: 12 }, icon: { insetInlineEnd: 10 } } },
      MuiMenu: { styleOverrides: { paper: { borderRadius: '18px', borderStartEndRadius: '6px', border: '1px solid rgba(50,109,123,.14)', boxShadow: '0 20px 50px rgba(8,36,42,.16)' } } },
      MuiChip: { styleOverrides: { root: { borderRadius: '12px', borderStartEndRadius: '4px', transition: 'transform var(--motion-control), border-radius var(--motion-control), background-color var(--motion-control), box-shadow var(--motion-control)', '&.MuiChip-clickable:hover': { borderRadius: '12px', borderStartStartRadius: '4px', borderStartEndRadius: '12px', transform: 'translateY(-1px)', boxShadow: '0 7px 16px rgba(8,36,42,.1)' }, '&.MuiChip-clickable:active': { transform: 'translateY(1px) scale(.97)', boxShadow: 'none' } } } },
      MuiCard: { styleOverrides: { root: { borderRadius: 'var(--shape-panel)', borderStartEndRadius: 'var(--shape-panel-cut)', boxShadow: '0 12px 48px rgba(23,54,61,.08)' } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: '32px', borderStartEndRadius: '11px' } } },
    },
  }), [mode]);
  return <ColorModeContext.Provider value={colorMode}><ThemeProvider theme={theme}>{children}</ThemeProvider></ColorModeContext.Provider>;
}
