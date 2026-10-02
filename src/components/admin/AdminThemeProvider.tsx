'use client';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { ReactNode, useMemo } from 'react';

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const theme = useMemo(() => createTheme({
    cssVariables: true,
    palette: {
      mode: 'light',
      primary: { main: '#155E68', dark: '#0B3F47', light: '#D9ECEE', contrastText: '#FFFFFF' },
      secondary: { main: '#B7791F', dark: '#815313', light: '#FFF3D6', contrastText: '#FFFFFF' },
      background: { default: '#F4F6F7', paper: '#FFFFFF' },
      text: { primary: '#12262B', secondary: '#5D6D71' },
      divider: '#DCE3E5',
      success: { main: '#217A50' }, warning: { main: '#A7660B' }, error: { main: '#B42318' }, info: { main: '#276A86' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: 'var(--font-ui), Inter, Arial, sans-serif',
      h3: { fontSize: 'clamp(1.65rem, 2.2vw, 2.15rem)', lineHeight: 1.18, fontWeight: 720, letterSpacing: '-0.032em' },
      h4: { fontSize: '1.65rem', lineHeight: 1.2, fontWeight: 720, letterSpacing: '-0.025em' },
      h5: { fontSize: '1rem', lineHeight: 1.35, fontWeight: 680, letterSpacing: '-0.012em' },
      body1: { fontSize: '.95rem', lineHeight: 1.55 },
      body2: { fontSize: '.855rem', lineHeight: 1.5 },
      caption: { fontSize: '.75rem', lineHeight: 1.45 },
      button: { fontSize: '.84rem', fontWeight: 650, textTransform: 'none', letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: { styleOverrides: { '.admin-shell *': { scrollbarColor: '#BAC7CA transparent' } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 44, paddingInline: 15, cursor: 'pointer', overflow: 'hidden', isolation: 'isolate',
            borderRadius: 'var(--shape-control-compact)', borderStartEndRadius: 'var(--shape-control-compact-cut)',
            transition: 'transform var(--motion-control), border-radius var(--motion-control), background-color var(--motion-control), border-color var(--motion-control), color var(--motion-control), box-shadow var(--motion-control)',
            '& .MuiButton-startIcon, & .MuiButton-endIcon': { transition: 'transform var(--motion-control)' },
            '&:hover': { borderRadius: 'var(--shape-control-compact)', borderStartStartRadius: 'var(--shape-control-compact-cut)', borderStartEndRadius: 'var(--shape-control-compact)', transform: 'translateY(-1px)', boxShadow: '0 8px 18px rgba(18,38,43,.1)', '& .MuiButton-startIcon, & .MuiButton-endIcon': { transform: 'scale(1.06)' } },
            '&:active': { transform: 'translateY(1px) scale(.985)', boxShadow: 'none' },
            '&.Mui-disabled': { cursor: 'default', transform: 'none', boxShadow: 'none' },
          },
          sizeLarge: { minHeight: 48, paddingInline: 20 },
          contained: { boxShadow: '0 7px 16px rgba(11,63,71,.17), 3px 3px 0 rgba(183,121,31,.15)', '&:hover': { boxShadow: '0 11px 22px rgba(11,63,71,.2), 4px 4px 0 rgba(183,121,31,.2)' } },
          outlined: { borderColor: 'rgba(21,94,104,.36)', boxShadow: '0 4px 12px rgba(18,38,43,.05)', '&:hover': { borderColor: '#155E68', background: 'rgba(21,94,104,.045)' } },
          text: { boxShadow: 'none', '&:hover': { boxShadow: 'none', background: 'rgba(21,94,104,.055)' } },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            width: 44, height: 44, minWidth: 44, minHeight: 44, cursor: 'pointer',
            borderRadius: 'var(--shape-control-compact)', borderStartEndRadius: 'var(--shape-control-compact-cut)',
            transition: 'transform var(--motion-control), border-radius var(--motion-control), background-color var(--motion-control), color var(--motion-control), box-shadow var(--motion-control)',
            '&:hover': { borderRadius: 'var(--shape-control-compact)', borderStartStartRadius: 'var(--shape-control-compact-cut)', borderStartEndRadius: 'var(--shape-control-compact)', transform: 'translateY(-1px)', background: 'rgba(21,94,104,.07)', boxShadow: '0 7px 16px rgba(18,38,43,.09)' },
            '&:active': { transform: 'translateY(1px) scale(.94)', boxShadow: 'none' },
            '&.Mui-disabled': { cursor: 'default', transform: 'none', boxShadow: 'none' },
          },
        },
      },
      MuiCard: { styleOverrides: { root: { borderRadius: '18px', borderStartEndRadius: '6px', borderColor: '#DCE3E5', boxShadow: '0 1px 2px rgba(18,38,43,.04)' } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: '22px', borderStartEndRadius: '7px', boxShadow: '0 28px 80px rgba(6,26,31,.2)' } } },
      MuiDialogTitle: { styleOverrides: { root: { padding: '24px 24px 8px', fontSize: '1.25rem', fontWeight: 720 } } },
      MuiDialogContent: { styleOverrides: { root: { padding: '16px 24px 24px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px 24px' } } },
      MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true, size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 44, background: '#FFFFFF',
            borderRadius: 'var(--shape-control-compact)', borderStartEndRadius: 'var(--shape-control-compact-cut)',
            transition: 'border-radius var(--motion-control), background-color var(--motion-control), box-shadow var(--motion-control)',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#C8D3D6', transition: 'border-color var(--motion-control), border-width var(--motion-control)' },
            '&:hover': { background: '#FCFEFE', borderRadius: 'var(--shape-control-compact)', borderStartStartRadius: 'var(--shape-control-compact-cut)', borderStartEndRadius: 'var(--shape-control-compact)', boxShadow: '0 5px 14px rgba(18,38,43,.055)' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6D969D' },
            '&.Mui-focused': { borderRadius: 'var(--shape-control-compact)', borderStartStartRadius: 'var(--shape-control-compact-cut)', borderStartEndRadius: 'var(--shape-control-compact)', boxShadow: '0 0 0 3px rgba(21,94,104,.12), 4px 5px 0 rgba(183,121,31,.07)' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#155E68', borderWidth: 1.5 },
            '&.Mui-error.Mui-focused': { boxShadow: '0 0 0 3px rgba(180,35,24,.11), 4px 5px 0 rgba(180,35,24,.06)' },
            '&.Mui-disabled': { background: '#EEF2F3', boxShadow: 'none' },
          },
          input: { padding: '10px 12px', fontSize: '.875rem', lineHeight: 1.45 },
          multiline: { padding: '10px 12px', alignItems: 'flex-start' },
        },
      },
      MuiInputLabel: { styleOverrides: { root: { color: '#63757A', fontSize: '.875rem', fontWeight: 650, '&.Mui-focused': { color: '#155E68' } } } },
      MuiFormHelperText: { styleOverrides: { root: { marginTop: 5, marginInline: 3, lineHeight: 1.4 } } },
      MuiInputAdornment: { styleOverrides: { root: { color: '#63757A', '& .MuiSvgIcon-root': { fontSize: 19 }, '& .MuiIconButton-root': { width: 36, height: 36, minWidth: 36, minHeight: 36 } } } },
      MuiSelect: { styleOverrides: { select: { paddingBlock: 10 }, icon: { insetInlineEnd: 9 } } },
      MuiMenu: { styleOverrides: { paper: { borderRadius: '16px', borderStartEndRadius: '5px', border: '1px solid #DCE3E5', boxShadow: '0 18px 44px rgba(6,26,31,.16)' } } },
      MuiChip: { styleOverrides: { root: { height: 27, borderRadius: '10px', borderStartEndRadius: '3px', fontSize: '.68rem', fontWeight: 750, letterSpacing: '.035em', transition: 'transform var(--motion-control), border-radius var(--motion-control), background-color var(--motion-control), box-shadow var(--motion-control)', '&.MuiChip-clickable:hover': { borderRadius: '10px', borderStartStartRadius: '3px', borderStartEndRadius: '10px', transform: 'translateY(-1px)', boxShadow: '0 5px 12px rgba(18,38,43,.08)' } } } },
      MuiTableCell: { styleOverrides: { root: { borderColor: '#E6EBEC', padding: '13px 16px', fontSize: '.82rem' }, head: { color: '#63757A', fontSize: '.69rem', fontWeight: 750, letterSpacing: '.065em', textTransform: 'uppercase', background: '#F8FAFA' } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 10, fontSize: '.84rem' } } },
      MuiTooltip: { styleOverrides: { tooltip: { fontSize: '.74rem', borderRadius: 7 } } },
    },
  }), []);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
