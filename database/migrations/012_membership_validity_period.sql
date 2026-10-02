-- Optional membership validity window. NULL end dates remain open-ended for existing/lifetime memberships.
ALTER TABLE members
  ADD COLUMN membership_starts_at DATETIME(3) NULL AFTER membership_status,
  ADD COLUMN membership_ends_at DATETIME(3) NULL AFTER membership_starts_at,
  ADD KEY members_membership_window_idx (active, membership_ends_at, membership_starts_at);

UPDATE members
SET membership_starts_at = joined_at
WHERE membership_starts_at IS NULL;

