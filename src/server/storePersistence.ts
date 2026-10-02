import { createHash } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type {
  AdminRoleRecord, AdminUser, AuditEntry, EventInvitation, EventRecord, EventRegistration, GalleryItem,
  Member, MemberApplication, PostRecord, SponsorRecord, TicketTypeRecord,
} from '@/lib/types';
import { execute, isDatabaseConfigured, queryRows, withTransaction } from './database';

export type DatabaseStore = {
  applications: MemberApplication[];
  members: Member[];
  events: EventRecord[];
  ticketTypes: TicketTypeRecord[];
  posts: PostRecord[];
  gallery: GalleryItem[];
  sponsors: SponsorRecord[];
  registrations: EventRegistration[];
  invitations: EventInvitation[];
  adminRoles: AdminRoleRecord[];
  adminUsers: AdminUser[];
  audit: AuditEntry[];
};

type DbRow = RowDataPacket & Record<string, unknown>;
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
const optionalIso = (value: unknown) => value ? iso(value) : undefined;
const bool = (value: unknown) => Boolean(Number(value));
const categoryId = (name: string) => `cat_${createHash('sha256').update(name.trim().toLowerCase()).digest('hex').slice(0, 20)}`;
const categorySlug = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general';

export async function loadDatabaseSnapshot<T extends DatabaseStore>() {
  if (!isDatabaseConfigured) throw new Error('MariaDB configuration is required. Configure the DB_* environment variables before starting the platform.');
  const [applications, members, skills, events, ticketTypes, posts, gallery, sponsors, tickets, invitations, roles, rolePermissions, users, audit] = await Promise.all([
    queryRows<DbRow>('SELECT * FROM membership_applications ORDER BY created_at DESC'),
    queryRows<DbRow>(`SELECT id,user_id,full_name,email,phone,institution,program,member_role,membership_status,membership_starts_at,membership_ends_at,badge,
      total_contributions,city,quote,bio,website,events_attended,active,password_hash,joined_at,created_at,updated_at,
      (badge_image IS NOT NULL AND badge_image<>'') AS has_badge_image,
      (photo IS NOT NULL AND photo<>'') AS has_photo
      FROM members ORDER BY joined_at DESC`),
    queryRows<DbRow>('SELECT * FROM member_skills ORDER BY member_id, sort_order'),
    queryRows<DbRow>(`SELECT e.*, COALESCE(c.name_en, 'General') AS category_name,
      (SELECT COUNT(*) FROM tickets t WHERE t.event_id=e.id AND t.status IN ('ACTIVE','USED')) AS registered_count
      FROM events e LEFT JOIN event_categories c ON c.id = e.category_id ORDER BY e.starts_at`),
    queryRows<DbRow>('SELECT * FROM ticket_types ORDER BY event_id, created_at'),
    queryRows<DbRow>('SELECT * FROM posts ORDER BY created_at DESC'),
    queryRows<DbRow>('SELECT * FROM gallery_items ORDER BY created_at DESC'),
    queryRows<DbRow>('SELECT * FROM sponsors ORDER BY sort_order, created_at'),
    queryRows<DbRow>(`SELECT t.*, tt.name_en AS ticket_type_name, tt.price AS ticket_price
      FROM tickets t JOIN ticket_types tt ON tt.id = t.ticket_type_id ORDER BY t.created_at DESC`),
    queryRows<DbRow>('SELECT * FROM event_invitations ORDER BY created_at DESC'),
    queryRows<DbRow>('SELECT * FROM roles ORDER BY is_system DESC, name'),
    queryRows<DbRow>(`SELECT rp.role_id, p.name FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id ORDER BY p.name`),
    queryRows<DbRow>(`SELECT u.*, ur.role_id FROM users u JOIN user_roles ur ON ur.user_id = u.id ORDER BY u.created_at DESC`),
    queryRows<DbRow>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000'),
  ]);

  const skillMap = new Map<string, string[]>();
  for (const row of skills) (skillMap.get(String(row.member_id)) ?? skillMap.set(String(row.member_id), []).get(String(row.member_id))!).push(String(row.skill));
  const permissionMap = new Map<string, string[]>();
  for (const row of rolePermissions) (permissionMap.get(String(row.role_id)) ?? permissionMap.set(String(row.role_id), []).get(String(row.role_id))!).push(String(row.name));

  return {
    applications: applications.map(row => ({
      id: String(row.id), reference: String(row.reference), recruitmentPeriodId: row.recruitment_period_id ? String(row.recruitment_period_id) : undefined, fullName: String(row.full_name), email: String(row.email), phone: String(row.phone),
      city: String(row.city), institution: String(row.institution), program: String(row.program), contribution: Number(row.contribution),
      motivation: String(row.motivation), photoDataUrl: row.photo ? String(row.photo) : undefined, cvName: row.cv_name ? String(row.cv_name) : undefined,
      consent: bool(row.consent), status: row.status as MemberApplication['status'], createdAt: iso(row.created_at),
    })),
    members: members.map(row => ({
      id: String(row.id), fullName: String(row.full_name), email: String(row.email ?? ''), phone: String(row.phone), institution: String(row.institution),
      program: String(row.program), role: row.member_role as Member['role'], membershipStatus: row.membership_status as Member['membershipStatus'],
      membershipStartsAt: optionalIso(row.membership_starts_at), membershipEndsAt: optionalIso(row.membership_ends_at),
      badge: String(row.badge), badgeImageDataUrl: bool(row.has_badge_image) ? `/api/members/${encodeURIComponent(String(row.id))}/media/badge` : undefined, totalContributions: Number(row.total_contributions),
      photoDataUrl: bool(row.has_photo) ? `/api/members/${encodeURIComponent(String(row.id))}/media/photo` : undefined, city: String(row.city), quote: String(row.quote), bio: String(row.bio),
      website: row.website ? String(row.website) : undefined, skills: skillMap.get(String(row.id)) ?? [], eventsAttended: Number(row.events_attended),
      active: bool(row.active), passwordHash: String(row.password_hash), joinedAt: iso(row.joined_at),
    })),
    events: events.map(row => ({
      id: String(row.id), slug: String(row.slug), title: { en: String(row.title_en), ar: String(row.title_ar) },
      summary: { en: String(row.summary_en), ar: String(row.summary_ar) }, location: { en: String(row.location_en), ar: String(row.location_ar) },
      startsAt: iso(row.starts_at), endsAt: iso(row.ends_at), deadlineAt: optionalIso(row.registration_deadline_at), capacity: Number(row.capacity),
      registered: Number(row.registered_count ?? 0), status: row.status as EventRecord['status'], category: String(row.category_name),
      coverPath: row.cover_path ? String(row.cover_path) : undefined,
    })),
    ticketTypes: ticketTypes.map(row => ({
      id: String(row.id), eventId: String(row.event_id), name: { en: String(row.name_en), ar: String(row.name_ar) },
      description: row.description_en || row.description_ar ? { en: String(row.description_en ?? ''), ar: String(row.description_ar ?? '') } : undefined,
      price: Number(row.price), quantity: row.quantity === null ? undefined : Number(row.quantity), saleStartsAt: optionalIso(row.sale_starts_at),
      saleEndsAt: optionalIso(row.sale_ends_at), validFrom: optionalIso(row.valid_from), validUntil: optionalIso(row.valid_until),
      status: row.status as TicketTypeRecord['status'], createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
    })),
    posts: posts.map(row => ({
      id: String(row.id), slug: String(row.slug), title: { en: String(row.title_en), ar: String(row.title_ar) },
      excerpt: { en: String(row.excerpt_en), ar: String(row.excerpt_ar) }, content: { en: String(row.content_en), ar: String(row.content_ar) },
      category: String(row.category), coverPath: row.cover_path ? String(row.cover_path) : undefined, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
    })),
    gallery: gallery.map(row => ({ id: String(row.id), mediaType: row.media_type as GalleryItem['mediaType'], filePath: String(row.file_path), title: { en: String(row.title_en), ar: String(row.title_ar) }, createdAt: iso(row.created_at) })),
    sponsors: sponsors.map(row => ({ id: String(row.id), name: String(row.name), level: row.level as SponsorRecord['level'], logoPath: String(row.logo_path), websiteUrl: row.website_url ? String(row.website_url) : undefined, sortOrder: Number(row.sort_order), active: bool(row.active) })),
    registrations: tickets.map(row => ({
      id: String(row.id), eventId: String(row.event_id), fullName: String(row.participant_name), email: String(row.participant_email ?? ''), phone: String(row.participant_phone ?? ''),
      studentId: String(row.participant_student_id ?? ''), programCode: String(row.participant_program ?? ''), amountMad: Number(row.ticket_price),
      ticketTypeId: String(row.ticket_type_id), ticketTypeName: String(row.ticket_type_name), ticketCode: String(row.ticket_code), ticketStatus: row.status as EventRegistration['ticketStatus'],
      waitlistPosition: row.waitlist_position === null ? undefined : Number(row.waitlist_position), checkedInAt: optionalIso(row.used_at),
      checkedInBy: row.used_by_user_id ? String(row.used_by_user_id) : undefined, createdAt: iso(row.created_at),
    })),
    invitations: invitations.map(row => ({ id: String(row.id), eventId: String(row.event_id), memberId: String(row.member_id), status: row.status as EventInvitation['status'], reason: row.reason ? String(row.reason) : undefined, createdAt: iso(row.created_at), respondedAt: optionalIso(row.responded_at) })),
    adminRoles: roles.map(row => ({ id: String(row.id), name: String(row.name), description: String(row.description), permissions: (permissionMap.get(String(row.id)) ?? []) as AdminRoleRecord['permissions'], system: bool(row.is_system), createdAt: iso(row.created_at) })),
    adminUsers: users.map(row => ({ id: String(row.id), fullName: String(row.full_name), email: String(row.email), roleId: String(row.role_id), active: row.status === 'ACTIVE', passwordHash: String(row.password_hash ?? ''), createdAt: iso(row.created_at) })),
    audit: audit.map(row => ({ id: String(row.id), actor: String(row.actor_label), action: String(row.action), resource: String(row.resource_id ?? row.resource_type), success: bool(row.success), createdAt: iso(row.created_at), detail: String(row.detail ?? '') })),
  } as T;
}

async function deleteMissing(connection: PoolConnection, table: string, ids: string[], extra = '') {
  if (!ids.length) return execute(`DELETE FROM ${table}${extra ? ` WHERE ${extra}` : ''}`, [], connection);
  const condition = `${extra ? `${extra} AND ` : ''}id NOT IN (${ids.map(() => '?').join(',')})`;
  return execute(`DELETE FROM ${table} WHERE ${condition}`, ids, connection);
}

export async function saveDatabaseSnapshot(snapshot: DatabaseStore) {
  if (!isDatabaseConfigured) throw new Error('MariaDB configuration is required.');
  await withTransaction(async connection => {
    for (const role of snapshot.adminRoles) {
      await execute(`INSERT INTO roles (id,name,description,is_system,created_at) VALUES (?,?,?,?,?)
        ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),is_system=VALUES(is_system)`, [role.id, role.name, role.description, role.system ? 1 : 0, role.createdAt], connection);
      await execute('DELETE FROM role_permissions WHERE role_id=?', [role.id], connection);
      for (const permission of role.permissions) {
        await execute(`INSERT IGNORE INTO role_permissions (role_id,permission_id) SELECT ?,id FROM permissions WHERE name=?`, [role.id, permission], connection);
      }
    }
    await deleteMissing(connection, 'roles', snapshot.adminRoles.map(item => item.id), 'is_system=0');
    for (const user of snapshot.adminUsers) {
      await execute(`INSERT INTO users (id,full_name,email,password_hash,status,created_at) VALUES (?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),email=VALUES(email),password_hash=VALUES(password_hash),status=VALUES(status)`, [user.id, user.fullName, user.email, user.passwordHash, user.active ? 'ACTIVE' : 'DISABLED', user.createdAt], connection);
      await execute('DELETE FROM user_roles WHERE user_id=?', [user.id], connection);
      await execute('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)', [user.id, user.roleId], connection);
    }
    if (snapshot.adminUsers.length) {
      await execute(`DELETE u FROM users u JOIN user_roles ur ON ur.user_id=u.id WHERE u.id NOT IN (${snapshot.adminUsers.map(() => '?').join(',')})`, snapshot.adminUsers.map(item => item.id), connection);
    } else {
      await execute('DELETE u FROM users u JOIN user_roles ur ON ur.user_id=u.id', [], connection);
    }

    for (const application of snapshot.applications) await execute(`INSERT INTO membership_applications
      (id,reference,recruitment_period_id,full_name,email,phone,city,institution,program,contribution,motivation,photo,cv_name,consent,status,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE recruitment_period_id=VALUES(recruitment_period_id),full_name=VALUES(full_name),email=VALUES(email),phone=VALUES(phone),city=VALUES(city),institution=VALUES(institution),program=VALUES(program),contribution=VALUES(contribution),motivation=VALUES(motivation),photo=VALUES(photo),cv_name=VALUES(cv_name),consent=VALUES(consent),status=VALUES(status)`,
      [application.id, application.reference, application.recruitmentPeriodId ?? null, application.fullName, application.email, application.phone, application.city, application.institution, application.program, application.contribution, application.motivation, application.photoDataUrl ?? null, application.cvName ?? null, application.consent ? 1 : 0, application.status, application.createdAt], connection);
    await deleteMissing(connection, 'membership_applications', snapshot.applications.map(item => item.id));

    for (const member of snapshot.members) {
      await execute(`INSERT INTO members (id,full_name,email,phone,institution,program,member_role,membership_status,membership_starts_at,membership_ends_at,badge,badge_image,total_contributions,photo,city,quote,bio,website,events_attended,active,password_hash,joined_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),email=VALUES(email),phone=VALUES(phone),institution=VALUES(institution),program=VALUES(program),member_role=VALUES(member_role),membership_status=VALUES(membership_status),membership_starts_at=VALUES(membership_starts_at),membership_ends_at=VALUES(membership_ends_at),badge=VALUES(badge),badge_image=CASE WHEN VALUES(badge_image) LIKE 'data:%' THEN VALUES(badge_image) WHEN VALUES(badge_image)='' THEN NULL ELSE badge_image END,total_contributions=VALUES(total_contributions),photo=CASE WHEN VALUES(photo) LIKE 'data:%' THEN VALUES(photo) WHEN VALUES(photo)='' THEN NULL ELSE photo END,city=VALUES(city),quote=VALUES(quote),bio=VALUES(bio),website=VALUES(website),events_attended=VALUES(events_attended),active=VALUES(active),password_hash=VALUES(password_hash)`,
        [member.id, member.fullName, member.email || null, member.phone, member.institution, member.program, member.role, member.membershipStatus, member.membershipStartsAt ?? null, member.membershipEndsAt ?? null, member.badge, member.badgeImageDataUrl ?? null, member.totalContributions, member.photoDataUrl ?? null, member.city, member.quote, member.bio, member.website ?? null, member.eventsAttended, member.active ? 1 : 0, member.passwordHash, member.joinedAt], connection);
      await execute('DELETE FROM member_skills WHERE member_id=?', [member.id], connection);
      for (const [index, skill] of member.skills.entries()) await execute('INSERT INTO member_skills (member_id,skill,sort_order) VALUES (?,?,?)', [member.id, skill, index], connection);
    }
    await deleteMissing(connection, 'members', snapshot.members.map(item => item.id));

    for (const event of snapshot.events) {
      const catId = categoryId(event.category);
      await execute(`INSERT INTO event_categories (id,slug,name_en,name_ar) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name_en=VALUES(name_en),name_ar=VALUES(name_ar)`, [catId, categorySlug(event.category), event.category, event.category], connection);
      await execute(`INSERT INTO events (id,category_id,slug,title_en,title_ar,summary_en,summary_ar,location_en,location_ar,starts_at,ends_at,registration_deadline_at,capacity,status,cover_path)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),slug=VALUES(slug),title_en=VALUES(title_en),title_ar=VALUES(title_ar),summary_en=VALUES(summary_en),summary_ar=VALUES(summary_ar),location_en=VALUES(location_en),location_ar=VALUES(location_ar),starts_at=VALUES(starts_at),ends_at=VALUES(ends_at),registration_deadline_at=VALUES(registration_deadline_at),capacity=VALUES(capacity),status=VALUES(status),cover_path=VALUES(cover_path)`,
        [event.id, catId, event.slug, event.title.en, event.title.ar, event.summary.en, event.summary.ar, event.location.en, event.location.ar, event.startsAt, event.endsAt, event.deadlineAt ?? null, event.capacity, event.status, event.coverPath ?? null], connection);
    }

    for (const ticketType of snapshot.ticketTypes) await execute(`INSERT INTO ticket_types (id,event_id,name_en,name_ar,description_en,description_ar,price,quantity,sale_starts_at,sale_ends_at,valid_from,valid_until,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE event_id=VALUES(event_id),name_en=VALUES(name_en),name_ar=VALUES(name_ar),description_en=VALUES(description_en),description_ar=VALUES(description_ar),price=VALUES(price),quantity=VALUES(quantity),sale_starts_at=VALUES(sale_starts_at),sale_ends_at=VALUES(sale_ends_at),valid_from=VALUES(valid_from),valid_until=VALUES(valid_until),status=VALUES(status)`,
      [ticketType.id, ticketType.eventId, ticketType.name.en, ticketType.name.ar, ticketType.description?.en ?? null, ticketType.description?.ar ?? null, ticketType.price, ticketType.quantity ?? null, ticketType.saleStartsAt ?? null, ticketType.saleEndsAt ?? null, ticketType.validFrom ?? null, ticketType.validUntil ?? null, ticketType.status, ticketType.createdAt, ticketType.updatedAt], connection);

    for (const ticket of snapshot.registrations) {
      const values = [ticket.eventId, ticket.ticketTypeId, ticket.fullName, ticket.email || null, ticket.phone || null, ticket.studentId || null, ticket.programCode || null, ticket.ticketCode, ticket.ticketStatus, ticket.waitlistPosition ?? null, ticket.checkedInAt ?? null, ticket.checkedInBy ?? null, ticket.id];
      const updated = await execute(`UPDATE tickets SET event_id=?,ticket_type_id=?,participant_name=?,participant_email=?,participant_phone=?,participant_student_id=?,participant_program=?,ticket_code=?,status=?,waitlist_position=?,used_at=?,used_by_user_id=? WHERE id=?`, values, connection);
      const existing = updated.affectedRows ? true : Boolean((await queryRows<DbRow>('SELECT id FROM tickets WHERE id=? LIMIT 1', [ticket.id], connection))[0]);
      if (!existing) {
        if (!ticket.ticketToken) throw new Error(`Ticket ${ticket.ticketCode} is missing its secure creation token.`);
        const tokenHash = createHash('sha256').update(ticket.ticketToken).digest('hex');
        await execute(`INSERT INTO tickets (id,event_id,ticket_type_id,participant_name,participant_email,participant_phone,participant_student_id,participant_program,ticket_code,qr_token_hash,status,waitlist_position,used_at,used_by_user_id,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [ticket.id, ticket.eventId, ticket.ticketTypeId, ticket.fullName, ticket.email || null, ticket.phone || null, ticket.studentId || null, ticket.programCode || null, ticket.ticketCode, tokenHash, ticket.ticketStatus, ticket.waitlistPosition ?? null, ticket.checkedInAt ?? null, ticket.checkedInBy ?? null, ticket.createdAt], connection);
      }
    }
    await deleteMissing(connection, 'tickets', snapshot.registrations.map(item => item.id));
    await deleteMissing(connection, 'ticket_types', snapshot.ticketTypes.map(item => item.id));
    await deleteMissing(connection, 'events', snapshot.events.map(item => item.id));

    for (const post of snapshot.posts) await execute(`INSERT INTO posts (id,slug,title_en,title_ar,excerpt_en,excerpt_ar,content_en,content_ar,category,cover_path,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE slug=VALUES(slug),title_en=VALUES(title_en),title_ar=VALUES(title_ar),excerpt_en=VALUES(excerpt_en),excerpt_ar=VALUES(excerpt_ar),content_en=VALUES(content_en),content_ar=VALUES(content_ar),category=VALUES(category),cover_path=VALUES(cover_path),updated_at=VALUES(updated_at)`,
      [post.id, post.slug, post.title.en, post.title.ar, post.excerpt.en, post.excerpt.ar, post.content.en, post.content.ar, post.category, post.coverPath ?? null, post.createdAt, post.updatedAt], connection);
    await deleteMissing(connection, 'posts', snapshot.posts.map(item => item.id));
    for (const item of snapshot.gallery) await execute(`INSERT INTO gallery_items (id,media_type,file_path,title_en,title_ar,created_at) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE media_type=VALUES(media_type),file_path=VALUES(file_path),title_en=VALUES(title_en),title_ar=VALUES(title_ar)`, [item.id, item.mediaType, item.filePath, item.title.en, item.title.ar, item.createdAt], connection);
    await deleteMissing(connection, 'gallery_items', snapshot.gallery.map(item => item.id));
    for (const sponsor of snapshot.sponsors) await execute(`INSERT INTO sponsors (id,name,level,logo_path,website_url,sort_order,active) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),level=VALUES(level),logo_path=VALUES(logo_path),website_url=VALUES(website_url),sort_order=VALUES(sort_order),active=VALUES(active)`, [sponsor.id, sponsor.name, sponsor.level, sponsor.logoPath, sponsor.websiteUrl ?? null, sponsor.sortOrder, sponsor.active ? 1 : 0], connection);
    await deleteMissing(connection, 'sponsors', snapshot.sponsors.map(item => item.id));

    for (const invitation of snapshot.invitations) await execute(`INSERT INTO event_invitations (id,event_id,member_id,status,reason,responded_at,created_at) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),reason=VALUES(reason),responded_at=VALUES(responded_at)`, [invitation.id, invitation.eventId, invitation.memberId, invitation.status, invitation.reason ?? null, invitation.respondedAt ?? null, invitation.createdAt], connection);
    await deleteMissing(connection, 'event_invitations', snapshot.invitations.map(item => item.id));

    for (const item of snapshot.audit) await execute(`INSERT INTO audit_logs (id,actor_label,action,resource_type,resource_id,success,detail,created_at) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE detail=VALUES(detail),success=VALUES(success)`, [item.id, item.actor, item.action, 'platform', item.resource, item.success ? 1 : 0, item.detail, item.createdAt], connection);
  });
}
