export type Locale = 'en' | 'ar';
export type Localized = { en: string; ar: string };

export type MemberRole = 'MEMBER' | 'TEAM_LEAD' | 'BUREAU' | 'PRESIDENT';
export type MembershipStatus = 'SIMPLE' | 'SPECIAL';
export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REASSIGNED';
export type TicketStatus = 'ACTIVE' | 'WAITLIST' | 'USED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED' | 'DELETED';
export type ScanResult = 'valid' | 'invalid' | 'not_found' | 'already_used' | 'cancelled' | 'refunded' | 'wrong_event' | 'expired' | 'not_yet_valid' | 'unauthorized' | 'duplicate' | 'error';
export type AdminPermission =
  | 'dashboard.view'
  | 'events.view'
  | 'events.manage'
  | 'content.manage'
  | 'applications.view'
  | 'applications.manage'
  | 'finance.view'
  | 'donations.view'
  | 'donations.manage'
  | 'registrations.view'
  | 'registrations.manage'
  | 'tickets.view'
  | 'tickets.download'
  | 'tickets.scan'
  | 'scan_logs.view'
  | 'scan_logs.export'
  | 'ticket_security.view'
  | 'members.view'
  | 'members.manage'
  | 'attendance.view'
  | 'invitations.manage'
  | 'audit.view'
  | 'roles.manage'
  | 'sponsorship.view'
  | 'sponsorship.manage'
  | 'sponsorship.finance';

export type AdminRoleRecord = {
  id: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
  system?: boolean;
  createdAt: string;
};

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  active: boolean;
  passwordHash: string;
  createdAt: string;
};

export type MemberApplication = {
  id: string;
  reference: string;
  recruitmentPeriodId?: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  institution: string;
  program: string;
  contribution: number;
  motivation: string;
  photoDataUrl?: string;
  cvName?: string;
  consent: boolean;
  status: ApplicationStatus;
  createdAt: string;
};

export type Member = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  institution: string;
  program: string;
  role: MemberRole;
  membershipStatus: MembershipStatus;
  membershipStartsAt?: string;
  membershipEndsAt?: string;
  badge: string;
  badgeImageDataUrl?: string;
  totalContributions: number;
  photoDataUrl?: string;
  city: string;
  quote: string;
  bio: string;
  website?: string;
  skills: string[];
  eventsAttended: number;
  active: boolean;
  passwordHash: string;
  joinedAt: string;
};

export type EventRecord = {
  id: string;
  slug: string;
  title: Localized;
  summary: Localized;
  location: Localized;
  startsAt: string;
  endsAt: string;
  capacity: number;
  registered: number;
  status: 'PUBLISHED' | 'DRAFT' | 'CLOSED';
  category: string;
  coverPath?: string;
  deadlineAt?: string;
};

export type TicketTypeRecord = {
  id: string;
  eventId: string;
  name: Localized;
  description?: Localized;
  price: number;
  quantity?: number;
  saleStartsAt?: string;
  saleEndsAt?: string;
  validFrom?: string;
  validUntil?: string;
  status: 'ACTIVE' | 'HIDDEN' | 'SOLD_OUT' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
};

export type PostRecord = {
  id: string;
  slug: string;
  title: Localized;
  excerpt: Localized;
  content: Localized;
  category: string;
  coverPath?: string;
  createdAt: string;
  updatedAt: string;
};

export type GalleryItem = {
  id: string;
  mediaType: 'PHOTO' | 'VIDEO';
  filePath: string;
  title: Localized;
  createdAt: string;
};

export type SponsorLevel = 'GOLD' | 'SILVER' | 'BRONZE' | 'PARTNER';
export type SponsorRecord = {
  id: string;
  name: string;
  level: SponsorLevel;
  logoPath: string;
  websiteUrl?: string;
  sortOrder: number;
  active: boolean;
};

export type EventRegistration = {
  id: string;
  eventId: string;
  fullName: string;
  email: string;
  phone: string;
  studentId: string;
  programCode: string;
  amountMad: number;
  ticketTypeId: string;
  ticketTypeName: string;
  ticketCode: string;
  ticketToken?: string;
  ticketQrDataUrl?: string;
  ticketStatus: TicketStatus;
  waitlistPosition?: number;
  checkedInAt?: string;
  checkedInBy?: string;
  createdAt: string;
};

export type ScanLogRecord = {
  id: string;
  eventId: string;
  ticketId?: string;
  scannedValue: string;
  scannerUserId: string;
  scannerName?: string;
  scanResult: ScanResult;
  rejectionReason?: string;
  scannedAt: string;
  deviceInfo?: string;
  ipAddress?: string;
  ticketCode?: string;
  ticketType?: string;
  participantName?: string;
  createdAt: string;
  updatedAt: string;
};

export type EventInvitation = {
  id: string;
  eventId: string;
  memberId: string;
  status: InvitationStatus;
  reason?: string;
  createdAt: string;
  respondedAt?: string;
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  resource: string;
  success: boolean;
  createdAt: string;
  detail: string;
};
