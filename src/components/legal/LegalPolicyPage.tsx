import { ArrowBackOutlined, ArrowForwardOutlined, CheckCircleOutline, ContactSupportOutlined, GavelOutlined, PolicyOutlined, ShieldOutlined, UpdateOutlined } from '@mui/icons-material';
import { Box, Chip, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { loadLegalDocument } from '@/lib/legal';

function ContentBlock({block}:{block:string}) {
  const lines=block.split('\n').map(line=>line.trim()).filter(Boolean);
  if(lines.length>1){const lead=lines[0].endsWith(':')?lines.shift():undefined;return <>{lead&&<Typography className="legal-block-lead">{lead}</Typography>}<Box component="ul" className="legal-bullet-list">{lines.map((line,index)=><li key={`${line}-${index}`}>{line.replace(/^[•-]\s*/,'')}</li>)}</Box></>}
  return <Typography className="legal-section-paragraph">{block}</Typography>;
}

export async function LegalPolicyPage({locale,slug}:{locale:string;slug:string}) {
  const document=await loadLegalDocument(slug,locale);if(!document)return null;
  const ar=locale==='ar', BackIcon=ar?ArrowForwardOutlined:ArrowBackOutlined;
  const requiredCount=document.sections.filter(section=>document.definition.mandatorySections.includes(section.number)).length;
  return <Box component="main" className="legal-document-page" dir={ar?'rtl':'ltr'}>
    <Box className="legal-document-hero"><Box className="legal-document-grid" aria-hidden="true"/><Box className="container">
      <Link href={`/${locale}/legal`} className="legal-back-link"><BackIcon/>{ar?'كل السياسات':'All policies'}</Link>
      <Box className="legal-document-heading"><Box className="legal-document-mark"><PolicyOutlined/><span/></Box><Box><Typography className="eyebrow">{ar?'وثيقة رسمية':'OFFICIAL POLICY'}</Typography><Typography component="h1" variant="h1">{ar?document.definition.title.ar:document.definition.title.en}</Typography><Typography>{ar?document.definition.summary.ar:document.definition.summary.en}</Typography></Box></Box>
      <Stack direction="row" flexWrap="wrap" gap={1} className="legal-document-meta"><Chip label={`${ar?'الإصدار':'Version'} ${document.version}`}/><Chip icon={<UpdateOutlined/>} label={`${ar?'سارية منذ':'Effective'} ${document.effectiveDate}`}/><Chip icon={<ShieldOutlined/>} label={`${requiredCount} ${ar?'بنداً إلزامياً':'required sections'}`}/></Stack>
    </Box></Box>
    <Box className="container legal-document-layout">
      <Box component="aside" className="legal-toc"><Typography className="legal-toc-title">{ar?'في هذه الوثيقة':'IN THIS DOCUMENT'}</Typography><Box component="nav" aria-label={ar?'فهرس الوثيقة':'Policy contents'}>{document.sections.map(section=><Box component="a" href={`#section-${section.number}`} key={section.number} className={document.definition.mandatorySections.includes(section.number)?'is-required':''}><span>{section.number}</span><small>{section.title}</small></Box>)}</Box><Box className="legal-contact-mini"><ContactSupportOutlined/><Typography fontWeight={900}>{ar?'سؤال قانوني أو طلب خصوصية؟':'Policy or privacy question?'}</Typography><Box component="a" href="mailto:contact@leadersoftomorrowestk.com">contact@leadersoftomorrowestk.com</Box></Box></Box>
      <Box component="article" className="legal-article">
        <Box className="legal-required-notice"><GavelOutlined/><Box><Typography fontWeight={950}>{ar?'البنود ذات العلامة الذهبية إلزامية':'Gold-marked sections are mandatory'}</Typography><Typography>{ar?'تتطلب هذه البنود التزاماً أو قبولاً عند استعمال الخدمة المرتبطة بها. اقرأها قبل إرسال أي نموذج.':'These clauses require compliance or acceptance when you use the related service. Read them before submitting a form.'}</Typography></Box></Box>
        {document.sections.map(section=>{const required=document.definition.mandatorySections.includes(section.number);return <Box component="section" id={`section-${section.number}`} className={`legal-section-card${required?' is-required':''}`} key={section.number}>
          <Box className="legal-section-number"><span>{String(section.number).padStart(2,'0')}</span>{required&&<Chip icon={<CheckCircleOutline/>} label={ar?'إلزامي':'Required'} size="small"/>}</Box>
          <Typography component="h2" variant="h3">{section.title}</Typography>
          <Box className="legal-section-body">{section.blocks.map((block,index)=><ContentBlock block={block} key={index}/>)}</Box>
        </Box>})}
        <Box className="legal-acceptance-footer"><ShieldOutlined/><Box><Typography component="h2" variant="h4">{ar?'نسخة موثقة وواضحة':'A clear, versioned record'}</Typography><Typography>{ar?'الإصدار 1.0، ساري ومراجع في 29 يوليو 2026. عند طلب قبول إلكتروني، تحفظ المنصة حالة القبول مع الطلب المرتبط. يجب مراجعة الصياغة من مستشار قانوني مغربي قبل اعتمادها كصيغة نهائية خارج النادي.':'Version 1.0, effective and reviewed 29 July 2026. When electronic acceptance is required, the platform stores the acceptance with the related request. The wording should be reviewed by qualified Moroccan counsel before external legal reliance.'}</Typography></Box><Link href={`/${locale}/contact`}>{ar?'تواصل معنا':'Contact us'} {ar?<ArrowBackOutlined/>:<ArrowForwardOutlined/>}</Link></Box>
      </Box>
    </Box>
  </Box>;
}
