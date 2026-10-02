import { AlternateEmail, ArrowForward, CodeRounded, EmailOutlined, Facebook, GitHub, Instagram, Language, LinkedIn, LocationOnOutlined, SendOutlined } from '@mui/icons-material';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { TikTokIcon } from './SocialIcons';

const clubEmail = 'contact@leadersoftomorrowestk.com';

const developerLinks = [
  ['LinkedIn', 'https://www.linkedin.com/in/ourida-abdelwahed/', LinkedIn],
  ['GitHub', 'https://github.com/OuridaAbdelwahed', GitHub],
  ['Instagram', 'https://www.instagram.com/1bdul__?igsh=MTBvaTh6b282OXppZw==', Instagram],
  ['Facebook', 'https://web.facebook.com/abdelwahed.wydadi.5', Facebook],
  ['Threads', 'https://www.threads.com/@1bdul__', AlternateEmail],
  ['TikTok', 'https://www.tiktok.com/@o1abdul_?_r=1&_t=ZS-98EWGJLIAlh', TikTokIcon],
  ['Portfolio', 'https://ouridaabdelwahed.github.io/', Language],
] as const;

export function ContactExperience({ locale }: { locale: string }) {
  const ar = locale === 'ar';
  return (
    <Box className="contact-experience">
      <Box className="contact-ambient contact-ambient-one" aria-hidden="true" />
      <Box className="contact-ambient contact-ambient-two" aria-hidden="true" />
      <Box className="container contact-experience-grid">
        <Box className="contact-copy-panel">
          <Typography className="eyebrow">{ar ? 'لنتواصل' : 'LET’S CONNECT'}</Typography>
          <Typography component="h1" variant="h1">{ar ? 'ابدأ محادثة تصنع أثراً.' : <>Start a conversation<br />that creates <span>impact.</span></>}</Typography>
          <Typography>{ar ? 'سواء كنت طالباً أو شريكاً أو متحدثاً أو لديك فكرة جديدة، سنوجه رسالتك إلى الشخص المناسب.' : 'Whether you are a student, partner, speaker, or bringing a new idea, we’ll route your message to the right person.'}</Typography>
          <Stack className="contact-detail-list">
            <Box><Box className="contact-detail-icon"><EmailOutlined /></Box><Box><Typography variant="caption">{ar ? 'البريد الإلكتروني' : 'EMAIL'}</Typography><Typography component="a" href={`mailto:${clubEmail}`}>{clubEmail}</Typography></Box></Box>
            <Box><Box className="contact-detail-icon"><LocationOnOutlined /></Box><Box><Typography variant="caption">{ar ? 'الموقع' : 'LOCATION'}</Typography><Typography>Khenifra, Morocco</Typography></Box></Box>
          </Stack>
          <Button component="a" href={`mailto:${clubEmail}?subject=Leaders%20of%20Tomorrow%20contact`} variant="contained" color="secondary" endIcon={<SendOutlined />}>{ar ? 'راسل الفريق' : 'Email the team'}</Button>
        </Box>

        <Box className="developer-contact-card form-card-special">
          <Box className="developer-photo-shape"><Box component="img" src="/media/people/designer.png" alt="Ourida Abdelwahed" /></Box>
          <Box className="developer-contact-copy">
            <Box className="developer-role-icon"><CodeRounded /></Box>
            <Typography className="eyebrow" color="primary.main">{ar ? 'التصميم والتطوير' : 'DESIGN & DEVELOPMENT'}</Typography>
            <Typography component="h2" variant="h2">Ourida Abdelwahed</Typography>
            <Typography color="text.secondary">{ar ? 'مسؤولة التصميم والتطوير الرقمي للمنصة، متاحة للاستفسارات التقنية والتعاون الإبداعي.' : 'Design lead and platform developer, available for technical questions and creative collaboration.'}</Typography>
            <Button component="a" href="mailto:ouridaabdelwahed@gmail.com" variant="outlined" endIcon={<ArrowForward />}>ouridaabdelwahed@gmail.com</Button>
            <Box className="developer-contact-socials" aria-label="Ourida Abdelwahed links">{developerLinks.map(([label, href, Icon]) => <IconButton key={label} component="a" href={href} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon /></IconButton>)}</Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
