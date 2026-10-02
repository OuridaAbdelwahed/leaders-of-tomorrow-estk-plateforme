'use client';

import { CameraswitchOutlined, CheckCircle, Close, QrCodeScannerOutlined, Refresh, VideocamOffOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { IScannerControls } from '@zxing/browser';
import { useCallback, useEffect, useRef, useState } from 'react';

type ScannerEvent = { id: string; title: { en: string; ar: string }; startsAt: string; status: string };
type ScanResponse = {
  success: boolean; result: string; message: string; rejectionReason?: string;
  ticket?: { ticketCode: string; participantName: string; ticketType: string; eventName: string; validatedAt: string; validationStatus: string };
  scan?: { id?: string; scannedAt: string };
};

const permissionDenied = 'L’accès à la caméra a été refusé. Veuillez autoriser la caméra pour scanner le QR code.';
const noCamera = 'Aucune caméra disponible sur cet appareil.';
const unsupported = 'Votre navigateur ne prend pas en charge le scanner QR.';

export function TicketScannerPanel() {
  const [events, setEvents] = useState<ScannerEvent[]>();
  const [eventId, setEventId] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResponse>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);
  const lastValueRef = useRef('');

  useEffect(() => {
    if (!result) return;
    const sound = new Audio(result.success ? '/sounds/ticket-scan-success.mp3' : '/sounds/ticket-scan-error.mp3');
    sound.volume = result.success ? 0.75 : 0.65;
    void sound.play().catch(() => undefined);
    return () => {
      sound.pause();
      sound.currentTime = 0;
    };
  }, [result]);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop(); controlsRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null;
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; }
    setCameraOn(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/scanner/events', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Unable to load scanner events.');
      setEvents(body.events); setEventId((current: string) => current || body.events[0]?.id || '');
    }).catch(value => { if (value.name !== 'AbortError') setCameraError(value instanceof Error ? value.message : 'Unable to load scanner events.'); });
    return () => { controller.abort(); stopCamera(); };
  }, [stopCamera]);

  const validate = useCallback(async (value: string) => {
    if (!eventId || !value.trim() || processingRef.current) return;
    processingRef.current = true; setLoading(true); setCameraError(''); stopCamera();
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/scan`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payload: value.trim() }) });
      const body = await response.json() as ScanResponse;
      setResult(body);
    } catch {
      setResult({ success: false, result: 'error', message: 'Erreur du serveur ou du réseau.', rejectionReason: 'Erreur du serveur ou du réseau.', scan: { scannedAt: new Date().toISOString() } });
    } finally { setLoading(false); processingRef.current = false; }
  }, [eventId, stopCamera]);

  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(''); setResult(undefined); lastValueRef.current = '';
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setCameraError(unsupported); return; }
    if (!eventId) { setCameraError('Sélectionnez un événement avant de démarrer le scanner.'); return; }
    stopCamera();
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      if (!devices.length) { setCameraError(noCamera); return; }
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 180, delayBetweenScanSuccess: 1000 });
      const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }, videoRef.current ?? undefined, decoded => {
        const value = decoded?.getText();
        if (!value || processingRef.current || value === lastValueRef.current) return;
        lastValueRef.current = value; setManualValue(value); stopCamera(); void validate(value);
      });
      controlsRef.current = controls;
      streamRef.current = videoRef.current?.srcObject instanceof MediaStream ? videoRef.current.srcObject : null;
      setCameraOn(true);
    } catch (error) {
      stopCamera();
      const name = error instanceof DOMException ? error.name : '';
      setCameraError(name === 'NotAllowedError' || name === 'SecurityError' ? permissionDenied : name === 'NotFoundError' || name === 'OverconstrainedError' ? noCamera : unsupported);
    }
  }, [eventId, facingMode, stopCamera, validate]);

  const switchCamera = async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next); await startCamera(next);
  };
  const nextTicket = async () => { setResult(undefined); setManualValue(''); processingRef.current = false; lastValueRef.current = ''; await startCamera(facingMode); };

  return <>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'end' }} gap={2} sx={{ mb: 3 }}>
      <Box><Typography variant="overline" color="primary">DOOR CONTROL</Typography><Typography component="h1" variant="h3">Ticket scanner</Typography><Typography color="text.secondary" sx={{ mt: .75 }}>Select an authorized event, open the device camera, and position the QR code inside the frame.</Typography></Box>
      <Stack direction="row" gap={1} flexWrap="wrap"><Button disabled={!cameraOn || loading} startIcon={<CameraswitchOutlined />} onClick={switchCamera}>Switch camera</Button><Button variant={cameraOn ? 'outlined' : 'contained'} disabled={loading || !eventId} startIcon={cameraOn ? <VideocamOffOutlined /> : <QrCodeScannerOutlined />} onClick={cameraOn ? stopCamera : () => startCamera()}>{cameraOn ? 'Close scanner' : 'Open scanner'}</Button></Stack>
    </Stack>
    <Box sx={{ display: 'grid', gridTemplateColumns: { lg: 'minmax(0,1.2fr) minmax(300px,.8fr)' }, gap: 2.5 }}>
      <Card variant="outlined"><CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <TextField select fullWidth label="Event" value={eventId} onChange={event => { stopCamera(); setEventId(event.target.value); setResult(undefined); }} disabled={!events?.length || loading} sx={{ mb: 2 }}>
          {(events ?? []).map(event => <MenuItem key={event.id} value={event.id}>{event.title.en} · {new Intl.DateTimeFormat('fr', { dateStyle: 'medium' }).format(new Date(event.startsAt))}</MenuItem>)}
        </TextField>
        {events?.length === 0 && <Alert severity="warning" sx={{ mb: 2 }}>No authorized events are available for this scanner account.</Alert>}
        <Box className="live-scanner-viewport">
          <Box component="video" ref={videoRef} muted playsInline aria-label="Live camera preview" />
          {!cameraOn && <Stack className="scanner-idle" alignItems="center" textAlign="center" spacing={1}><QrCodeScannerOutlined /><Typography variant="h5">Camera ready</Typography><Typography variant="body2">Open the scanner to request camera permission.</Typography></Stack>}
          {cameraOn && <><Box className="scanner-target-frame" aria-hidden="true"><i /><i /><i /><i /></Box><Box className="scanner-sweep" aria-hidden="true" /></>}
          {loading && <Box className="scanner-loading"><CircularProgress color="inherit" /><Typography>Validation en cours…</Typography></Box>}
        </Box>
        {cameraError && <Alert severity="error" role="alert" sx={{ mt: 2 }}>{cameraError}</Alert>}
      </CardContent></Card>
      <Card variant="outlined"><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5">Manual fallback</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5, mb: 2 }}>Use this only when camera scanning is unavailable.</Typography>
        <Stack spacing={1.5}><TextField multiline minRows={3} label="QR value" value={manualValue} onChange={event => setManualValue(event.target.value)} disabled={loading} /><Button variant="contained" disabled={loading || !eventId || !manualValue.trim()} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <QrCodeScannerOutlined />} onClick={() => validate(manualValue)}>{loading ? 'Validation…' : 'Validate ticket'}</Button></Stack>
      </CardContent></Card>
    </Box>
    <ScanResultDialog result={result} close={() => setResult(undefined)} next={nextTicket} />
  </>;
}

function ScanResultDialog({ result, close, next }: { result?: ScanResponse; close: () => void; next: () => void }) {
  if (!result) return null;
  return <Dialog open maxWidth="sm" fullWidth onClose={close} aria-labelledby="scan-result-title" PaperProps={{ className: result.success ? 'scan-result-dialog is-success' : 'scan-result-dialog is-rejected' }}>
    <DialogTitle id="scan-result-title" sx={{ pr: 7 }}><Stack direction="row" alignItems="center" gap={1.25}>{result.success ? <CheckCircle color="success" /> : <Close color="error" />}<span>{result.success ? 'Billet validé' : 'Billet refusé'}</span></Stack><IconButton onClick={close} aria-label="Close result" sx={{ position: 'absolute', top: 8, right: 8 }}><Close /></IconButton></DialogTitle>
    <DialogContent><Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 2 }}>{result.message}</Alert>{result.ticket ? <Stack spacing={1.25}>
      <ResultRow label="Participant" value={result.ticket.participantName} /><ResultRow label="Event" value={result.ticket.eventName} /><ResultRow label="Ticket type" value={result.ticket.ticketType} /><ResultRow label="Ticket code" value={result.ticket.ticketCode} mono /><ResultRow label="Scan time" value={new Intl.DateTimeFormat('fr', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(result.ticket.validatedAt))} /><ResultRow label="Status" value={result.ticket.validationStatus} />
    </Stack> : <Typography color="text.secondary">{result.rejectionReason || result.message}</Typography>}<Chip sx={{ mt: 2 }} label={result.result} color={result.success ? 'success' : 'error'} /></DialogContent>
    <DialogActions sx={{ p: 2.5 }}><Button variant="contained" startIcon={<Refresh />} onClick={next}>Scanner le billet suivant</Button></DialogActions>
  </Dialog>;
}

function ResultRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <Stack direction="row" justifyContent="space-between" gap={2}><Typography color="text.secondary">{label}</Typography><Typography fontWeight={750} textAlign="right" sx={{ fontFamily: mono ? 'monospace' : undefined }}>{value}</Typography></Stack>; }
