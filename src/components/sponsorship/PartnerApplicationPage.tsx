import { Box } from '@mui/material';
import { PartnershipRequestForm } from './PartnershipRequestForm';

export function PartnerApplicationPage({ locale }: { locale: string }) {
  return (
    <Box className="partner-application-page">
      <Box className="container partner-application-shell">
        <PartnershipRequestForm locale={locale} />
      </Box>
    </Box>
  );
}
