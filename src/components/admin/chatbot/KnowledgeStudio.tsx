'use client';

import {
  CloudSyncOutlined, DeleteOutline, DescriptionOutlined, InsertDriveFileOutlined,
  LockOutlined, PsychologyOutlined, UploadFileOutlined,
} from '@mui/icons-material';
import {
  Alert, Box, Button, Card, CardContent, Chip, FormControlLabel, IconButton,
  LinearProgress, MenuItem, Stack, Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { type DragEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type Row=Record<string,unknown>;
type Payload={sources:Row[];stats:Row;runs:Row[]};
const uploadTypes=[
  ['PDF','PDF document'],['WORD','Word (.docx)'],['IMAGE','Image with text'],
  ['WHATSAPP','WhatsApp export'],['INSTAGRAM','Instagram export'],['TIKTOK','TikTok export'],
  ['CONVERSATION','Other conversation'],
] as const;
const accepted='.pdf,.docx,.png,.jpg,.jpeg,.webp,.txt,.csv,.json,.html,.htm,.md';
const number=(value:unknown)=>Number(value||0);
const when=(value:unknown)=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(String(value))):'Not yet';

export function KnowledgeStudio(){
  const [data,setData]=useState<Payload>();
  const [mode,setMode]=useState<'file'|'text'>('file');
  const [sourceType,setSourceType]=useState('PDF');
  const [language,setLanguage]=useState('en');
  const [title,setTitle]=useState('');
  const [rawText,setRawText]=useState('');
  const [active,setActive]=useState(false);
  const [file,setFile]=useState<File>();
  const [busy,setBusy]=useState(false);
  const [dragging,setDragging]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const input=useRef<HTMLInputElement>(null);

  const request=useCallback(async(url:string,init?:RequestInit)=>{
    const response=await fetch(url,{cache:'no-store',...init});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Request failed.');
    return result;
  },[]);
  const load=useCallback(async()=>{
    try{setData(await request('/api/admin/chatbot/knowledge'));}
    catch(value){setError(value instanceof Error?value.message:'Unable to load training sources.');}
  },[request]);
  useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer);},[load]);

  const run=async(work:()=>Promise<unknown>,message:string)=>{
    setBusy(true);setError('');setNotice('');
    try{await work();setNotice(message);await load();}
    catch(value){setError(value instanceof Error?value.message:'Training operation failed.');}
    finally{setBusy(false);}
  };
  const submit=async(event:FormEvent)=>{
    event.preventDefault();
    if(mode==='file'){
      if(!file){setError('Select a supported file first.');return;}
      const form=new FormData();
      form.set('sourceType',sourceType);form.set('language',language);form.set('title',title);
      form.set('active',String(active));form.set('file',file);
      await run(()=>request('/api/admin/chatbot/knowledge',{method:'POST',body:form}),'The document was extracted and indexed successfully.');
    }else{
      await run(()=>request('/api/admin/chatbot/knowledge',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sourceType,language,title,text:rawText,active})}),'The text was indexed successfully.');
    }
    setFile(undefined);setTitle('');setRawText('');if(input.current)input.current.value='';
  };
  const choose=(selected?:File)=>{if(!selected)return;setFile(selected);if(!title)setTitle(selected.name.replace(/\.[^.]+$/,''));};
  const drop=(event:DragEvent)=>{event.preventDefault();setDragging(false);choose(event.dataTransfer.files[0]);};
  const mutate=(id:string,method:'PATCH'|'DELETE',body?:unknown)=>run(
    ()=>request(`/api/admin/chatbot/knowledge/${id}`,{method,headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined}),
    method==='DELETE'?'Imported source deleted.':'Source visibility updated.',
  );
  const canSubmit=Boolean(title.trim())&&(mode==='file'?Boolean(file):rawText.trim().length>=20);

  return <Stack spacing={2.5}>
    {busy&&<LinearProgress aria-label="Training operation in progress"/>}
    {error&&<Alert severity="error" onClose={()=>setError('')}>{error}</Alert>}
    {notice&&<Alert severity="success" onClose={()=>setNotice('')}>{notice}</Alert>}

    <Box className="knowledge-summary-grid">
      {([
        ['Ready sources',data?.stats.total_sources,PsychologyOutlined],
        ['Active knowledge',data?.stats.active_sources,DescriptionOutlined],
        ['Platform sources',data?.stats.platform_sources,CloudSyncOutlined],
        ['Indexed chunks',data?.stats.total_chunks,InsertDriveFileOutlined],
      ] as const).map(([label,value,Icon])=><Card key={label}><CardContent><Icon color="primary"/><Typography variant="h4" mt={2}>{number(value)}</Typography><Typography color="text.secondary">{label}</Typography></CardContent></Card>)}
    </Box>

    <Card className="knowledge-sync-card"><CardContent>
      <Stack direction={{xs:'column',md:'row'}} gap={2} alignItems={{md:'center'}}>
        <Box><Chip size="small" color="success" icon={<CloudSyncOutlined/>} label="Automatic public-content sync"/><Typography variant="h4" mt={1.5}>Platform knowledge</Typography><Typography color="text.secondary">Published events, posts and features, gallery metadata, active sponsors, and public offer details are indexed automatically. Member, ticket, payment, coupon-code, and administrator data are excluded.</Typography></Box>
        <Button sx={{ml:{md:'auto'},flex:'0 0 auto'}} variant="contained" startIcon={<CloudSyncOutlined/>} disabled={busy} onClick={()=>run(()=>request('/api/admin/chatbot/knowledge',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'SYNC_PLATFORM'})}),'Public platform knowledge is up to date.')}>Sync now</Button>
      </Stack>
    </CardContent></Card>

    <Card><CardContent>
      <Stack direction="row" gap={1} alignItems="center"><Box className="chatbot-admin-icon"><UploadFileOutlined/></Box><Box><Typography variant="h4">Train from approved material</Typography><Typography color="text.secondary">Files are processed locally. Imported knowledge remains private until you explicitly activate it.</Typography></Box></Stack>
      <Tabs value={mode} onChange={(_,value)=>{setMode(value);setSourceType(value==='file'?'PDF':'RAW_TEXT');}} sx={{mt:2,mb:2}}><Tab value="file" label="Document or export"/><Tab value="text" label="Raw text"/></Tabs>
      <Box component="form" onSubmit={submit}>
        <Box className="knowledge-form-grid">
          <TextField select label="Source format" value={sourceType} onChange={event=>setSourceType(event.target.value)}>{mode==='file'?uploadTypes.map(([value,label])=><MenuItem key={value} value={value}>{label}</MenuItem>):[['RAW_TEXT','Raw text'],['CONVERSATION','Pasted conversation']].map(([value,label])=><MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
          <TextField select label="Content language" value={language} onChange={event=>setLanguage(event.target.value)}>{[['en','English'],['fr','French'],['ar','Arabic'],['darija','Darija']].map(([value,label])=><MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
          <TextField label="Knowledge source title" value={title} onChange={event=>setTitle(event.target.value)} inputProps={{maxLength:255}} required/>
        </Box>
        {mode==='file'?<Box className={`knowledge-dropzone ${dragging?'is-dragging':''}`} tabIndex={0} role="button" aria-label="Choose a training file" onClick={()=>input.current?.click()} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();input.current?.click();}}} onDragOver={event=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={drop}>
          <input ref={input} hidden type="file" accept={accepted} onChange={event=>choose(event.target.files?.[0])}/><UploadFileOutlined/><Typography fontWeight={850}>{file?file.name:'Drop a supported file here or browse'}</Typography><Typography variant="body2" color="text.secondary">PDF, DOCX, PNG, JPEG, WebP, TXT, CSV, JSON, HTML, or Markdown · maximum 15 MB</Typography>{file&&<Chip size="small" label={`${(file.size/1024/1024).toFixed(2)} MB`}/>} 
        </Box>:<TextField fullWidth multiline minRows={9} label={sourceType==='CONVERSATION'?'Paste a conversation export':'Paste approved knowledge text'} value={rawText} onChange={event=>setRawText(event.target.value)} inputProps={{maxLength:2_000_000}} required/>}
        <Stack mt={2} direction={{xs:'column',sm:'row'}} gap={2} alignItems={{sm:'center'}}><FormControlLabel control={<Switch checked={active} onChange={event=>setActive(event.target.checked)}/>} label="Make available to the public assistant after indexing"/><Button sx={{ml:{sm:'auto'}}} type="submit" variant="contained" startIcon={<PsychologyOutlined/>} disabled={busy||!canSubmit}>Extract and train</Button></Stack>
      </Box>
      <Alert icon={<LockOutlined/>} severity="info" sx={{mt:2}}>WhatsApp, Instagram, and TikTok are supported through administrator-provided export files—never by collecting account credentials. Conversation imports remove common names, phone numbers, emails, links, and secrets before indexing.</Alert>
    </CardContent></Card>

    <Card><CardContent>
      <Typography variant="h4">Knowledge sources</Typography><Typography color="text.secondary" mb={2}>Platform sources are lifecycle-managed by automatic sync. Imported sources can be activated, paused, or deleted.</Typography>
      <Box className="knowledge-source-list">{data?.sources.length?data.sources.map(row=><Box className="knowledge-source-row" key={String(row.id)}>
        <Box><Stack direction="row" gap={1} flexWrap="wrap" alignItems="center"><Typography fontWeight={850}>{String(row.title)}</Typography><Chip size="small" label={String(row.source_type).replaceAll('_',' ')}/>{Boolean(row.auto_synced)&&<Chip size="small" color="info" label="Auto"/>}</Stack><Typography variant="caption" color="text.secondary">{String(row.language).toUpperCase()} · {number(row.chunk_count)} chunks · trained {when(row.trained_at)}</Typography></Box>
        <Chip color={row.status==='READY'?'success':row.status==='FAILED'?'error':'default'} variant="outlined" label={String(row.status)}/>
        <Stack direction="row" alignItems="center"><Tooltip title={Boolean(row.active)?'Pause public retrieval':'Activate for public retrieval'}><Switch checked={Boolean(row.active)} disabled={busy||row.status!=='READY'} onChange={event=>void mutate(String(row.id),'PATCH',{active:event.target.checked})}/></Tooltip>{!Boolean(row.auto_synced)&&<Tooltip title="Delete imported source"><IconButton color="error" disabled={busy} onClick={()=>confirm('Delete this imported knowledge source?')&&void mutate(String(row.id),'DELETE')}><DeleteOutline/></IconButton></Tooltip>}</Stack>
      </Box>):<Box className="knowledge-empty"><PsychologyOutlined/><Typography fontWeight={800}>No indexed knowledge yet</Typography><Typography variant="body2" color="text.secondary">Run platform sync or import an approved source to begin.</Typography></Box>}</Box>
    </CardContent></Card>
  </Stack>;
}
