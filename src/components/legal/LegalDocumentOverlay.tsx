'use client';

import { CheckCircleOutline, Close, DescriptionOutlined, Search, ShieldOutlined } from '@mui/icons-material';
import { Box, CircularProgress, Dialog, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type PolicySummary = {
  slug: string;
  title: { en: string; ar: string };
  shortTitle: { en: string; ar: string };
  category: string;
};

type PolicyDocument = {
  definition: PolicySummary & { summary: { en: string; ar: string }; mandatorySections: number[] };
  owner: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: Array<{ number: number; title: string; blocks: string[] }>;
};

type OverlayData = { document: PolicyDocument; policies: PolicySummary[] };

function DocumentBlock({ block }: { block: string }) {
  const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length > 1) return <Box component="ul" className="legal-doc-overlay-list">{lines.map((line, index) => <li key={`${line}-${index}`}>{line.replace(/^[•-]\s*/, '')}</li>)}</Box>;
  return <Typography component="p" className="legal-doc-overlay-paragraph">{block}</Typography>;
}

export function LegalDocumentOverlay({ locale }: { locale: string }) {
  const ar = locale === 'ar';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<OverlayData>();
  const [search, setSearch] = useState('');
  const request = useRef<AbortController | null>(null);

  const openDocument = useCallback(async (slug: string, requestedLocale = locale) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setOpen(true);
    setLoading(true);
    setError('');
    setSearch('');
    try {
      const response = await fetch(`/api/public/legal/${encodeURIComponent(slug)}?locale=${requestedLocale === 'ar' ? 'ar' : 'en'}`, { signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load this document.');
      setData(result.data as OverlayData);
    } catch (value) {
      if ((value as Error).name !== 'AbortError') setError(value instanceof Error ? value.message : 'Unable to load this document.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    const intercept = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.hasAttribute('download') || anchor.closest('[data-legal-overlay-ignore]')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const match = url.pathname.match(/^\/(en|ar)\/legal\/([a-z0-9-]+)\/?$/i);
      if (!match) return;
      event.preventDefault();
      void openDocument(match[2], match[1]);
    };
    document.addEventListener('click', intercept);
    return () => document.removeEventListener('click', intercept);
  }, [openDocument]);

  useEffect(() => () => request.current?.abort(), []);

  const sections = useMemo(() => {
    if (!data) return [];
    const needle = search.trim().toLocaleLowerCase(locale === 'ar' ? 'ar' : 'en');
    if (!needle) return data.document.sections;
    return data.document.sections.filter(section => `${section.title} ${section.blocks.join(' ')}`.toLocaleLowerCase(locale === 'ar' ? 'ar' : 'en').includes(needle));
  }, [data, locale, search]);

  const close = () => { request.current?.abort(); setOpen(false); };
  const title = data ? data.document.definition.title[ar ? 'ar' : 'en'] : (ar ? 'الوثائق القانونية' : 'Legal documentation');

  return <Dialog open={open} onClose={close} maxWidth={false} className="legal-doc-overlay" slotProps={{ paper: { className: 'legal-doc-overlay-paper' }, backdrop: { className: 'legal-doc-overlay-backdrop' } }} aria-labelledby="legal-doc-overlay-title">
    <Box className="legal-doc-overlay-header">
      <Box className="legal-doc-overlay-path" dir="ltr"><DescriptionOutlined/><span>LOT DOCS</span><i>/</i><span>LEGAL</span><i>/</i><strong>{data?.document.definition.slug || '...'}</strong></Box>
      <TextField value={search} onChange={event => setSearch(event.target.value)} disabled={!data || loading} size="small" placeholder={ar ? 'ابحث داخل الوثيقة…' : 'Search this document…'} inputProps={{ 'aria-label': ar ? 'البحث داخل الوثيقة' : 'Search this document' }} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small"/></InputAdornment> }} className="legal-doc-overlay-search" />
      <IconButton onClick={close} aria-label={ar ? 'إغلاق الوثيقة' : 'Close document'}><Close/></IconButton>
    </Box>

    {loading ? <Box className="legal-doc-overlay-state"><CircularProgress size={28}/><Typography>{ar ? 'جارٍ تحميل الوثيقة الموثقة…' : 'Loading verified document…'}</Typography></Box> : error ? <Box className="legal-doc-overlay-state is-error"><Typography>{error}</Typography></Box> : data && <Box className="legal-doc-overlay-layout" dir={ar ? 'rtl' : 'ltr'}>
      <Box component="aside" className="legal-doc-overlay-sidebar">
        <Typography className="legal-doc-overlay-nav-label">{ar ? 'المستندات' : 'DOCUMENTS'}</Typography>
        <Box component="nav" aria-label={ar ? 'الوثائق القانونية' : 'Legal documents'} className="legal-doc-overlay-policies">
          {data.policies.map(policy => <button type="button" key={policy.slug} className={policy.slug === data.document.definition.slug ? 'is-active' : ''} onClick={() => void openDocument(policy.slug)}><span>{policy.shortTitle[ar ? 'ar' : 'en']}</span><small>{policy.category}</small></button>)}
        </Box>
        <Typography className="legal-doc-overlay-nav-label">{ar ? 'في هذه الصفحة' : 'ON THIS PAGE'}</Typography>
        <Box component="nav" aria-label={ar ? 'أقسام الوثيقة' : 'Document sections'} className="legal-doc-overlay-toc">
          {data.document.sections.map(section => <a key={section.number} href={`#overlay-section-${section.number}`}><span>{String(section.number).padStart(2, '0')}</span>{section.title}</a>)}
        </Box>
      </Box>

      <Box component="main" className="legal-doc-overlay-reader">
        <Box className="legal-doc-overlay-title-row">
          <Box><Typography className="legal-doc-overlay-kicker">{ar ? 'وثيقة رسمية موثقة' : 'VERIFIED OFFICIAL DOCUMENT'}</Typography><Typography id="legal-doc-overlay-title" component="h1">{title}</Typography></Box>
          <ShieldOutlined aria-hidden="true"/>
        </Box>
        <Typography className="legal-doc-overlay-summary">{data.document.definition.summary[ar ? 'ar' : 'en']}</Typography>
        <Box className="legal-doc-overlay-meta" dir="ltr"><span>VERSION {data.document.version}</span><span>EFFECTIVE {data.document.effectiveDate}</span><span>UPDATED {data.document.lastUpdated}</span></Box>

        {sections.length ? <Box component="article" className="legal-doc-overlay-article">
          {sections.map(section => {
            const mandatory = data.document.definition.mandatorySections.includes(section.number);
            return <Box component="section" id={`overlay-section-${section.number}`} className="legal-doc-overlay-section" key={section.number}>
              <Box className="legal-doc-overlay-section-number">{String(section.number).padStart(2, '0')}{mandatory && <span><CheckCircleOutline/>{ar ? 'إلزامي' : 'REQUIRED'}</span>}</Box>
              <Typography component="h2">{section.title}</Typography>
              {section.blocks.map((block, index) => <DocumentBlock key={index} block={block}/>)}
            </Box>;
          })}
        </Box> : <Box className="legal-doc-overlay-empty"><Search/><Typography>{ar ? 'لا توجد فقرات مطابقة. جرّب كلمة أخرى.' : 'No matching sections. Try a different term.'}</Typography></Box>}
      </Box>
    </Box>}
  </Dialog>;
}
