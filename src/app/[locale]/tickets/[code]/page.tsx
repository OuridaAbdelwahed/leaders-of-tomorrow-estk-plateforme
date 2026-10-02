import { DownloadOutlined, EventOutlined } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { notFound } from 'next/navigation';
import { getTicketByCodeAndToken } from '@/server/ticketingRepository';
import { privateMetadata } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata = privateMetadata('Private event ticket', 'Secure ticket access for an event participant.');

export default async function TicketPage({ params, searchParams }: { params: Promise<{ locale: string; code: string }>; searchParams: Promise<{ token?: string }> }) {
  const { locale, code } = await params;
  const { token = '' } = await searchParams;
  const ticket = token ? await getTicketByCodeAndToken(code, token) : undefined;
  if (!ticket) notFound();
  const ar = locale === 'ar';
  const base = `/api/tickets/${encodeURIComponent(ticket.code)}/download?token=${encodeURIComponent(token)}&locale=${ar ? 'ar' : 'en'}`;
  const filename = `ticket-${ticket.event.slug}-${ticket.code}`.toLowerCase() + '.png';
  return <Box component="main" className="ticket-download-page" dir={ar ? 'rtl' : 'ltr'}>
    <Box className="container ticket-download-container">
      <Box className="ticket-download-heading">
        <Box>
          <Typography className="eyebrow">{ar ? 'تذكرة الفعالية' : 'EVENT TICKET'}</Typography>
          <Typography component="h1" variant="h3">{ar ? ticket.event.title.ar : ticket.event.title.en}</Typography>
        </Box>
        <Typography color="text.secondary">{ar ? 'احفظ التذكرة على جهازك واعرض رمز QR عند المدخل.' : 'Save the ticket to your device and present its QR code at the entrance.'}</Typography>
      </Box>
      <Box className="compact-ticket-preview">
        <Box component="img" src={`${base}&preview=1`} alt={ar ? `تذكرة ${ticket.participantName}` : `Ticket for ${ticket.participantName}`} />
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" gap={1.5}>
        <Button component="a" href={base} download={filename} variant="contained" size="large" startIcon={<DownloadOutlined />}>
          {ar ? 'تحميل التذكرة' : 'Download ticket'}
        </Button>
        <Button href={`/${locale}/events/${ticket.event.slug}`} variant="outlined" size="large" startIcon={<EventOutlined />}>
          {ar ? 'العودة إلى الفعالية' : 'Back to event'}
        </Button>
      </Stack>
    </Box>
  </Box>;
}
