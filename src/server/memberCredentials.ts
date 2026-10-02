import { sendMail } from './mail';
import { memberCredentialMail } from './mailTemplates';
import { createToken, hashPassword } from './security';
import { ensureStoreReady, logAdminAction, persistStore, store } from './store';
import { hasCurrentMembership } from '@/features/membership/access';

const temporaryPassword = () => `LOT-${createToken().slice(0, 6)}-${createToken().slice(0, 6)}!`;

export async function generateMemberCredentials(id: string, sendEmail: boolean) {
  await ensureStoreReady();
  const member = store.members.find(item => item.id === id);
  if (!member) throw new Error('Member not found.');
  const password = temporaryPassword();

  if (!sendEmail) {
    member.passwordHash = hashPassword(password);
    logAdminAction('member.password_generated', member.id, `Initial access generated for ${member.fullName}`);
    await persistStore();
    return { status: 'generated' as const, temporaryPassword: password };
  }

  const result = await sendMail({ to: member.email, ...memberCredentialMail(member.fullName, password) });
  if (result.skipped) return { status: 'skipped' as const, reason: 'Add a real email address before sending credentials.' };
  if (result.development) return { status: 'simulated' as const, reason: 'Email delivery is not configured; the password was not changed.' };

  member.passwordHash = hashPassword(password);
  logAdminAction('member.credentials_emailed', member.id, `New access emailed to ${member.fullName}`);
  await persistStore();
  return { status: 'sent' as const };
}

export async function generateAndEmailAllMemberCredentials() {
  await ensureStoreReady();
  const summary = { sent: 0, simulated: 0, skipped: 0, failed: 0, total: 0 };
  for (const member of store.members.filter(item => hasCurrentMembership(item))) {
    summary.total += 1;
    try {
      const result = await generateMemberCredentials(member.id, true);
      summary[result.status === 'generated' ? 'simulated' : result.status] += 1;
    } catch {
      summary.failed += 1;
    }
  }
  logAdminAction('member.credentials_bulk', 'members', `${summary.sent} sent · ${summary.skipped} skipped · ${summary.failed} failed`);
  await persistStore();
  return summary;
}
