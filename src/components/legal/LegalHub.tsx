import { AccountBalanceOutlined, AutoAwesomeOutlined, BalanceOutlined, ConfirmationNumberOutlined, CookieOutlined, CopyrightOutlined, Diversity3Outlined, GavelOutlined, HandshakeOutlined, PaymentsOutlined, PolicyOutlined, ShieldOutlined } from '@mui/icons-material';
import { Box, Chip, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { legalPolicies } from '@/lib/legal';

const icons = {
  terms:GavelOutlined, privacy:ShieldOutlined, cookies:CookieOutlined, 'ai-usage':AutoAwesomeOutlined,
  'membership-agreement':Diversity3Outlined, 'internal-regulations':AccountBalanceOutlined,
  'code-of-conduct':BalanceOutlined, 'event-ticket-terms':ConfirmationNumberOutlined,
  'refunds-donations':PaymentsOutlined, copyright:CopyrightOutlined,
  'sponsorship-partnership':HandshakeOutlined,
} as const;

const categoryCopy = {
  platform:{en:'Platform & trust',ar:'المنصة والثقة'}, membership:{en:'Membership',ar:'العضوية'}, events:{en:'Events',ar:'الفعاليات'},
  finance:{en:'Financial',ar:'الشؤون المالية'}, partnerships:{en:'Partnerships',ar:'الشراكات'}, community:{en:'Community standards',ar:'معايير المجتمع'},
};

export function LegalHub({locale}:{locale:string}) {
  const ar=locale==='ar';
  return <Box component="main" className="legal-hub" dir={ar?'rtl':'ltr'}>
    <Box className="legal-orbit legal-orbit-one" aria-hidden="true"/><Box className="legal-orbit legal-orbit-two" aria-hidden="true"/>
    <Box className="container legal-hub-hero">
      <Box className="legal-brand-seal" aria-hidden="true"><BrandMark compact/><span><PolicyOutlined/></span></Box>
      <Typography className="eyebrow">{ar?'المركز القانوني والثقة':'LEGAL & TRUST CENTER'}</Typography>
      <Typography component="h1" variant="h1">{ar?'قواعد واضحة. حقوق محفوظة.':'Clear rules. Protected rights.'}</Typography>
      <Typography className="legal-hub-intro">{ar?'جميع السياسات والاتفاقيات الرسمية للنادي والمنصة في مكان واحد، بنسختين عربية وإنجليزية، مع إبراز البنود التي تتطلب التزامك.':'Every official Club and platform policy in one accessible place, in English and Arabic, with obligations and required acceptance clearly highlighted.'}</Typography>
      <Stack direction="row" flexWrap="wrap" gap={1.2} className="legal-meta-row"><Chip icon={<ShieldOutlined/>} label={ar?'الإصدار 1.0':'Version 1.0'}/><Chip icon={<PolicyOutlined/>} label={ar?'سارية منذ 29 يوليو 2026':'Effective 29 July 2026'}/><Chip label={ar?'القانون المغربي':'Moroccan law'}/></Stack>
    </Box>
    <Box className="container legal-policy-grid">
      {legalPolicies.map((policy,index)=>{const Icon=icons[policy.slug as keyof typeof icons]??PolicyOutlined;const cat=categoryCopy[policy.category];return <Link href={`/${locale}/legal/${policy.slug}`} className="legal-policy-card" key={policy.slug} style={{'--legal-delay':`${Math.min(index,7)*35}ms`} as CSSProperties}>
        <Box className="legal-card-top"><span><Icon/></span><Typography variant="caption">{ar?cat.ar:cat.en}</Typography><i>{String(index+1).padStart(2,'0')}</i></Box>
        <Typography component="h2" variant="h4">{ar?policy.title.ar:policy.title.en}</Typography>
        <Typography>{ar?policy.summary.ar:policy.summary.en}</Typography>
        <Box className="legal-card-footer"><small>{ar?policy.audience.ar:policy.audience.en}</small><strong>{ar?'اقرأ الوثيقة':'Read policy'} <span aria-hidden="true">{ar?'←':'→'}</span></strong></Box>
      </Link>})}
    </Box>
    <Box className="container legal-help-panel"><Box><ShieldOutlined/><div><Typography component="h2" variant="h4">{ar?'هل تحتاج إلى توضيح؟':'Need clarification?'}</Typography><Typography>{ar?'تواصل معنا بخصوص الخصوصية أو الحقوق أو الموافقات أو أي بند غير واضح.':'Contact us about privacy, rights, consent, or any clause that is not clear.'}</Typography></div></Box><Box component="a" href="mailto:contact@leadersoftomorrowestk.com">contact@leadersoftomorrowestk.com</Box></Box>
  </Box>;
}
