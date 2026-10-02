'use client';

import { CheckCircleOutline, SendOutlined, UploadFileOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Checkbox, TextField, Typography } from '@mui/material';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

const initial={companyName:'',contactName:'',phone:'',email:'',website:'',activity:'',budget:'',message:'',logo:'',companyProfile:'',agreementAccepted:false};

export function PartnershipRequestForm({locale}:{locale:string}) {
  const ar=locale==='ar';
  const [form,setForm]=useState(initial);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [reference,setReference]=useState('');
  const set=(key:string,value:unknown)=>setForm(current=>({...current,[key]:value}));
  const file=(key:'logo'|'companyProfile',selected?:File)=>{
    if(!selected)return;
    if(selected.size>(key==='logo'?4_000_000:8_000_000))return setError(ar?'الملف كبير جدًا.':'The selected file is too large.');
    const reader=new FileReader();reader.onload=()=>set(key,String(reader.result));reader.readAsDataURL(selected);
  };
  const submit=async(event:FormEvent)=>{
    event.preventDefault();setLoading(true);setError('');
    try{
      const response=await fetch('/api/public/sponsorship/requests',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...form,budget:form.budget?Number(form.budget):undefined,budgetCurrency:'MAD',locale})});
      const result=await response.json();if(!response.ok)throw new Error(result.error);setReference(result.reference);setForm(initial);
    }catch(value){setError(value instanceof Error?value.message:'Unable to submit request.');}finally{setLoading(false);}
  };
  if(reference)return <Box className="partnership-form-success"><CheckCircleOutline/><Typography component="h1" variant="h3">{ar?'تم استلام طلبك':'Your request is in'}</Typography><Typography>{ar?'احتفظ بهذا المرجع:':'Keep this reference:'} <strong>{reference}</strong></Typography><Button onClick={()=>setReference('')}>{ar?'إرسال طلب آخر':'Send another request'}</Button></Box>;
  return <Box component="form" onSubmit={submit} className="partnership-request-form">
    <Typography component="h1" variant="h3">{ar?'ابدأ شراكة':'Start a partnership'}</Typography>
    <Typography color="text.secondary" sx={{mb:3}}>{ar?'أخبرنا عن شركتك والنتيجة التي تريد تحقيقها.':'Tell us about your company and the outcome you want to create.'}</Typography>
    {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
    <Box className="partnership-form-grid">
      <TextField required label={ar?'الشركة':'Company'} value={form.companyName} onChange={event=>set('companyName',event.target.value)}/>
      <TextField required label={ar?'جهة الاتصال':'Contact name'} value={form.contactName} onChange={event=>set('contactName',event.target.value)}/>
      <TextField required type="tel" label={ar?'الهاتف':'Phone'} value={form.phone} onChange={event=>set('phone',event.target.value)}/>
      <TextField required type="email" label={ar?'البريد الإلكتروني':'Email'} value={form.email} onChange={event=>set('email',event.target.value)}/>
      <TextField type="url" label={ar?'الموقع':'Website'} value={form.website} onChange={event=>set('website',event.target.value)}/>
      <TextField required label={ar?'مجال النشاط':'Activity'} value={form.activity} onChange={event=>set('activity',event.target.value)}/>
      <TextField type="number" inputProps={{min:0}} label={ar?'الميزانية المتوقعة (درهم)':'Estimated budget (MAD)'} value={form.budget} onChange={event=>set('budget',event.target.value)}/>
      <Box className="form-upload-actions"><Button component="label" startIcon={<UploadFileOutlined/>}>{form.logo?(ar?'تم إرفاق الشعار':'Logo attached'):(ar?'رفع الشعار':'Upload logo')}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>file('logo',event.target.files?.[0])}/></Button><Button component="label" startIcon={<UploadFileOutlined/>}>{form.companyProfile?(ar?'تم إرفاق الملف':'Profile attached'):(ar?'ملف الشركة':'Company profile')}<input hidden type="file" accept="application/pdf" onChange={event=>file('companyProfile',event.target.files?.[0])}/></Button></Box>
      <TextField required multiline minRows={5} inputProps={{minLength:20}} label={ar?'رسالتك':'Partnership goals and message'} value={form.message} onChange={event=>set('message',event.target.value)} helperText={ar?'20 حرفًا على الأقل':'At least 20 characters'} sx={{gridColumn:'1/-1'}}/>
      <Box className="mandatory-consent-card" sx={{gridColumn:'1/-1'}}>
        <Checkbox id="partnership-policy-consent" required checked={form.agreementAccepted} onChange={event=>set('agreementAccepted',event.target.checked)} inputProps={{'aria-labelledby':'partnership-policy-consent-copy'}}/>
        <Box className="mandatory-consent-content">
          <Typography id="partnership-policy-consent-copy" component="p" className="mandatory-consent-copy">
            {ar ? <>أوافق على <Link href={`/${locale}/legal/sponsorship-partnership`} target="_blank" rel="noopener noreferrer">سياسة الرعاية والشراكات</Link> وعلى معالجة معلوماتي وفق <Link href={`/${locale}/legal/privacy`} target="_blank" rel="noopener noreferrer">سياسة الخصوصية</Link>، وأقر بـ<Link href={`/${locale}/legal/copyright`} target="_blank" rel="noopener noreferrer">سياسة حقوق النشر والملكية الفكرية</Link>.</> : <>I agree to the <Link href={`/${locale}/legal/sponsorship-partnership`} target="_blank" rel="noopener noreferrer">Sponsorship &amp; Partnership Policy</Link>, consent to information processing under the <Link href={`/${locale}/legal/privacy`} target="_blank" rel="noopener noreferrer">Privacy Policy</Link>, and acknowledge the <Link href={`/${locale}/legal/copyright`} target="_blank" rel="noopener noreferrer">Copyright &amp; Intellectual Property Policy</Link>.</>}
          </Typography>
        </Box>
      </Box>
    </Box>
    <Button type="submit" variant="contained" size="large" disabled={loading||!form.agreementAccepted} endIcon={<SendOutlined/>}>{loading?(ar?'جارٍ الإرسال…':'Sending…'):(ar?'إرسال الطلب':'Submit partnership request')}</Button>
  </Box>;
}
