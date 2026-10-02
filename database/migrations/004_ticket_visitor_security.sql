-- Secure no-login visitor verification and event ticket restriction workflow.
-- Run after 001_initial_schema.sql, 002_essential_roles_permissions.sql, and 003_member_contact_optional.sql.

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS email_normalized VARCHAR(190) NULL AFTER participant_email,
  ADD COLUMN IF NOT EXISTS verification_id VARCHAR(64) NULL AFTER valid_until,
  ADD COLUMN IF NOT EXISTS device_token_hash CHAR(64) NULL AFTER verification_id,
  ADD COLUMN IF NOT EXISTS fingerprint_hash CHAR(64) NULL AFTER device_token_hash,
  ADD COLUMN IF NOT EXISTS security_risk_score TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER fingerprint_hash,
  ADD COLUMN IF NOT EXISTS security_flags JSON NULL AFTER security_risk_score,
  ADD COLUMN IF NOT EXISTS created_ip_hash CHAR(64) NULL AFTER security_flags,
  ADD COLUMN IF NOT EXISTS active_email_key VARCHAR(190)
    GENERATED ALWAYS AS (
      CASE
        WHEN status NOT IN ('CANCELLED','REFUNDED','DELETED') THEN email_normalized
        ELSE NULL
      END
    ) STORED AFTER email_normalized;

UPDATE tickets
SET email_normalized = LOWER(TRIM(participant_email))
WHERE participant_email IS NOT NULL AND (email_normalized IS NULL OR email_normalized = '');

ALTER TABLE tickets
  ADD UNIQUE KEY IF NOT EXISTS tickets_event_active_email_unique (event_id, active_email_key),
  ADD KEY IF NOT EXISTS tickets_verification_idx (verification_id),
  ADD KEY IF NOT EXISTS tickets_device_hash_idx (event_id, device_token_hash),
  ADD KEY IF NOT EXISTS tickets_fingerprint_hash_idx (event_id, fingerprint_hash),
  ADD KEY IF NOT EXISTS tickets_created_ip_hash_idx (event_id, created_ip_hash);

CREATE TABLE IF NOT EXISTS email_verifications (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL,
  email_normalized VARCHAR(190) NOT NULL,
  email_hash CHAR(64) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  verification_token_hash CHAR(64) NOT NULL,
  device_token_hash CHAR(64) NOT NULL,
  fingerprint_hash CHAR(64) NULL,
  ip_hash CHAR(64) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('pending','verified','consumed','expired','blocked') NOT NULL DEFAULT 'pending',
  turnstile_success TINYINT(1) NOT NULL DEFAULT 0,
  expires_at DATETIME(3) NOT NULL,
  verified_at DATETIME(3) NULL,
  verification_expires_at DATETIME(3) NULL,
  consumed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY email_verifications_token_unique (verification_token_hash),
  KEY email_verifications_event_email_idx (event_id, email_normalized, status),
  KEY email_verifications_device_idx (event_id, device_token_hash),
  KEY email_verifications_ip_idx (event_id, ip_hash),
  KEY email_verifications_expires_idx (expires_at),
  CONSTRAINT email_verifications_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_security_events (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL,
  ticket_id VARCHAR(64) NULL,
  verification_id VARCHAR(64) NULL,
  email_masked VARCHAR(190) NULL,
  device_token_hash CHAR(64) NULL,
  fingerprint_hash CHAR(64) NULL,
  ip_hash CHAR(64) NULL,
  risk_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
  security_flags JSON NULL,
  action ENUM('otp_requested','otp_verified','ticket_allowed','ticket_blocked','rate_limited','turnstile_failed') NOT NULL,
  blocked TINYINT(1) NOT NULL DEFAULT 0,
  reason VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ticket_security_event_idx (event_id, created_at),
  KEY ticket_security_ticket_idx (ticket_id),
  KEY ticket_security_verification_idx (verification_id),
  KEY ticket_security_action_idx (action, blocked),
  KEY ticket_security_risk_idx (risk_score),
  CONSTRAINT ticket_security_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT ticket_security_ticket_fk FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
  CONSTRAINT ticket_security_verification_fk FOREIGN KEY (verification_id) REFERENCES email_verifications(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id VARCHAR(64) PRIMARY KEY,
  scope_key VARCHAR(255) NOT NULL,
  action VARCHAR(80) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY rate_limit_scope_idx (scope_key, action, created_at),
  KEY rate_limit_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (name, description) VALUES
  ('ticket_security.view', 'View visitor ticket verification and restriction security events')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_super_admin', id FROM permissions WHERE name = 'ticket_security.view';
