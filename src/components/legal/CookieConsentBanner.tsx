'use client';

import { CookieOutlined, ShieldOutlined } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const key='lot-cookie-consent-v1';

export function CookieConsentBanner({locale}:{locale:string}) {
  const ar=locale==='ar';const [open,setOpen]=useState(false);
  useEffect(()=>{const timer=window.setTimeout(()=>setOpen(!localStorage.getItem(key)),700);return()=>window.clearTimeout(timer);},[]);
  const choose=(preferences:boolean)=>{localStorage.setItem(key,JSON.stringify({version:'1.0',essential:true,preferences,analytics:preferences,acceptedAt:new Date().toISOString()}));setOpen(false);};
  if(!open)return null;
  return <Box component="aside" className="cookie-consent-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-consent-title">
    <Box className="cookie-consent-icon" aria-hidden="true"><CookieOutlined/><span><ShieldOutlined/></span></Box>
    <Box className="cookie-consent-copy"><Typography id="cookie-consent-title" component="h2" variant="h5">{ar?'اختيارات ملفات الارتباط':'Your cookie choices'}</Typography><Typography>{ar?'نستخدم ملفات أساسية لأمن الجلسة وتسجيل الدخول والتذاكر. يمكنك السماح أيضاً بملفات التفضيلات والتحليلات لتحسين تجربتك.':'We use essential cookies for session security, sign-in, and tickets. You can also allow preference and analytics cookies to improve your experience.'}</Typography><Link href={`/${locale}/legal/cookies`}>{ar?'اقرأ سياسة ملفات الارتباط':'Read the Cookie Policy'}</Link></Box>
    <Box className="cookie-consent-actions"><Button variant="outlined" onClick={()=>choose(false)}>{ar?'الأساسية فقط':'Essential only'}</Button><Button variant="contained" onClick={()=>choose(true)}>{ar?'السماح بالتفضيلات':'Allow preferences'}</Button></Box>
  </Box>;
}
