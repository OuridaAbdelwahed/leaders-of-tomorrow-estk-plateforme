-- Canonical MariaDB/MySQL schema. Keep this file aligned with migrations/001_initial_schema.sql.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NULL,
  status ENUM('ACTIVE','DISABLED','PENDING') NOT NULL DEFAULT 'ACTIVE',
  email_verified_at DATETIME(3) NULL,
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY roles_name_unique (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY permissions_name_unique (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id VARCHAR(64) NOT NULL,
  role_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT user_roles_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT user_roles_role_fk FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id VARCHAR(64) NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_fk FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_fk FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_categories (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  name_ar VARCHAR(120) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY event_categories_slug_unique (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS venues (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  address_en VARCHAR(500) NULL,
  address_ar VARCHAR(500) NULL,
  city VARCHAR(120) NULL,
  capacity INT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(64) PRIMARY KEY,
  created_by_user_id VARCHAR(64) NULL,
  category_id VARCHAR(64) NULL,
  venue_id VARCHAR(64) NULL,
  slug VARCHAR(160) NOT NULL,
  title_en VARCHAR(240) NOT NULL,
  title_ar VARCHAR(240) NOT NULL,
  summary_en TEXT NOT NULL,
  summary_ar TEXT NOT NULL,
  location_en VARCHAR(500) NOT NULL,
  location_ar VARCHAR(500) NOT NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  registration_deadline_at DATETIME(3) NULL,
  capacity INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('PUBLISHED','DRAFT','CLOSED','CANCELLED','DELETED') NOT NULL DEFAULT 'DRAFT',
  cover_path MEDIUMTEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY events_slug_unique (slug),
  KEY events_creator_idx (created_by_user_id),
  KEY events_category_idx (category_id),
  KEY events_venue_idx (venue_id),
  KEY events_dates_idx (starts_at, ends_at),
  CONSTRAINT events_creator_fk FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT events_category_fk FOREIGN KEY (category_id) REFERENCES event_categories(id) ON DELETE SET NULL,
  CONSTRAINT events_venue_fk FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_managers (
  event_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (event_id, user_id),
  CONSTRAINT event_managers_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT event_managers_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_images (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL,
  file_path MEDIUMTEXT NOT NULL,
  alt_en VARCHAR(255) NULL,
  alt_ar VARCHAR(255) NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY event_images_event_idx (event_id, sort_order),
  CONSTRAINT event_images_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_types (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  name_ar VARCHAR(120) NOT NULL,
  description_en VARCHAR(500) NULL,
  description_ar VARCHAR(500) NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity INT UNSIGNED NULL,
  sale_starts_at DATETIME(3) NULL,
  sale_ends_at DATETIME(3) NULL,
  valid_from DATETIME(3) NULL,
  valid_until DATETIME(3) NULL,
  status ENUM('ACTIVE','HIDDEN','SOLD_OUT','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ticket_types_event_idx (event_id, status),
  CONSTRAINT ticket_types_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(50) NOT NULL,
  institution VARCHAR(200) NOT NULL,
  program VARCHAR(200) NOT NULL,
  member_role ENUM('MEMBER','TEAM_LEAD','BUREAU','PRESIDENT') NOT NULL DEFAULT 'MEMBER',
  membership_status ENUM('SIMPLE','SPECIAL') NOT NULL DEFAULT 'SIMPLE',
  membership_starts_at DATETIME(3) NULL,
  membership_ends_at DATETIME(3) NULL,
  badge VARCHAR(100) NOT NULL,
  badge_image MEDIUMTEXT NULL,
  photo MEDIUMTEXT NULL,
  total_contributions DECIMAL(12,2) NOT NULL DEFAULT 0,
  city VARCHAR(120) NOT NULL,
  quote VARCHAR(255) NOT NULL,
  bio TEXT NOT NULL,
  website VARCHAR(500) NULL,
  events_attended INT UNSIGNED NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  password_hash VARCHAR(255) NOT NULL,
  joined_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY members_email_unique (email),
  KEY members_user_idx (user_id),
  KEY members_membership_window_idx (active, membership_ends_at, membership_starts_at),
  CONSTRAINT members_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS member_skills (
  member_id VARCHAR(64) NOT NULL,
  skill VARCHAR(100) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (member_id, skill),
  CONSTRAINT member_skills_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(80) NOT NULL,
  user_id VARCHAR(64) NULL,
  member_id VARCHAR(64) NULL,
  status ENUM('PENDING','PAID','CANCELLED','REFUNDED','FAILED') NOT NULL DEFAULT 'PENDING',
  currency CHAR(3) NOT NULL DEFAULT 'MAD',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY orders_order_number_unique (order_number),
  KEY orders_user_idx (user_id),
  KEY orders_member_idx (member_id),
  CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT orders_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  ticket_type_id VARCHAR(64) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY order_items_order_idx (order_id),
  KEY order_items_ticket_type_idx (ticket_type_id),
  CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT order_items_ticket_type_fk FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL,
  ticket_type_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(64) NULL,
  user_id VARCHAR(64) NULL,
  member_id VARCHAR(64) NULL,
  participant_name VARCHAR(160) NOT NULL,
  participant_email VARCHAR(190) NULL,
  email_normalized VARCHAR(190) NULL,
  active_email_key VARCHAR(190)
    GENERATED ALWAYS AS (
      CASE
        WHEN status NOT IN ('CANCELLED','REFUNDED','DELETED') THEN email_normalized
        ELSE NULL
      END
    ) STORED,
  participant_phone VARCHAR(50) NULL,
  participant_student_id VARCHAR(100) NULL,
  participant_program VARCHAR(240) NULL,
  ticket_code VARCHAR(100) NOT NULL,
  qr_token_hash CHAR(64) NOT NULL,
  status ENUM('ACTIVE','WAITLIST','USED','EXPIRED','CANCELLED','REFUNDED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  waitlist_position INT UNSIGNED NULL,
  valid_from DATETIME(3) NULL,
  valid_until DATETIME(3) NULL,
  verification_id VARCHAR(64) NULL,
  device_token_hash CHAR(64) NULL,
  fingerprint_hash CHAR(64) NULL,
  security_risk_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
  security_flags JSON NULL,
  created_ip_hash CHAR(64) NULL,
  used_at DATETIME(3) NULL,
  used_by_user_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY tickets_ticket_code_unique (ticket_code),
  UNIQUE KEY tickets_qr_token_unique (qr_token_hash),
  UNIQUE KEY tickets_event_active_email_unique (event_id, active_email_key),
  KEY tickets_event_idx (event_id),
  KEY tickets_type_idx (ticket_type_id),
  KEY tickets_order_idx (order_id),
  KEY tickets_status_idx (event_id, status),
  KEY tickets_verification_idx (verification_id),
  KEY tickets_device_hash_idx (event_id, device_token_hash),
  KEY tickets_fingerprint_hash_idx (event_id, fingerprint_hash),
  KEY tickets_created_ip_hash_idx (event_id, created_ip_hash),
  CONSTRAINT tickets_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
  CONSTRAINT tickets_type_fk FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT,
  CONSTRAINT tickets_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT tickets_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT tickets_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
  CONSTRAINT tickets_used_by_fk FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  payment_reference VARCHAR(120) NOT NULL,
  provider VARCHAR(80) NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MAD',
  status ENUM('PENDING','SUCCEEDED','FAILED','REFUNDED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  paid_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY payments_reference_unique (payment_reference),
  KEY payments_order_idx (order_id),
  CONSTRAINT payments_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refunds (
  id VARCHAR(64) PRIMARY KEY,
  payment_id VARCHAR(64) NOT NULL,
  ticket_id VARCHAR(64) NULL,
  amount DECIMAL(12,2) NOT NULL,
  reason VARCHAR(500) NULL,
  status ENUM('PENDING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  processed_by_user_id VARCHAR(64) NULL,
  processed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY refunds_payment_idx (payment_id),
  KEY refunds_ticket_idx (ticket_id),
  CONSTRAINT refunds_payment_fk FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
  CONSTRAINT refunds_ticket_fk FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
  CONSTRAINT refunds_user_fk FOREIGN KEY (processed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cancellations (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NULL,
  ticket_id VARCHAR(64) NULL,
  order_id VARCHAR(64) NULL,
  reason VARCHAR(500) NOT NULL,
  cancelled_by_user_id VARCHAR(64) NULL,
  cancelled_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY cancellations_event_idx (event_id),
  KEY cancellations_ticket_idx (ticket_id),
  CONSTRAINT cancellations_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  CONSTRAINT cancellations_ticket_fk FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
  CONSTRAINT cancellations_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT cancellations_user_fk FOREIGN KEY (cancelled_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scanner_event_access (
  user_id VARCHAR(64) NOT NULL,
  event_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, event_id),
  CONSTRAINT scanner_event_access_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT scanner_event_access_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scan_logs (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL,
  ticket_id VARCHAR(64) NULL,
  scanned_value VARCHAR(255) NOT NULL,
  scanner_user_id VARCHAR(64) NOT NULL,
  scan_result ENUM('valid','invalid','not_found','already_used','cancelled','refunded','wrong_event','expired','not_yet_valid','unauthorized','duplicate','error') NOT NULL,
  rejection_reason VARCHAR(500) NULL,
  scanned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  device_info VARCHAR(500) NULL,
  ip_address VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY scan_logs_event_idx (event_id),
  KEY scan_logs_ticket_idx (ticket_id),
  KEY scan_logs_scanner_idx (scanner_user_id),
  KEY scan_logs_result_idx (scan_result),
  KEY scan_logs_scanned_at_idx (scanned_at),
  KEY scan_logs_event_date_idx (event_id, scanned_at),
  CONSTRAINT scan_logs_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
  CONSTRAINT scan_logs_ticket_fk FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
  CONSTRAINT scan_logs_scanner_fk FOREIGN KEY (scanner_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS membership_recruitment_periods (
  id VARCHAR(64) PRIMARY KEY,
  title_en VARCHAR(160) NOT NULL,
  title_ar VARCHAR(160) NOT NULL,
  opens_at DATETIME(3) NOT NULL,
  closes_at DATETIME(3) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(64) NULL,
  updated_by_user_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY membership_recruitment_availability_idx (enabled, opens_at, closes_at),
  KEY membership_recruitment_creator_idx (created_by_user_id),
  KEY membership_recruitment_updater_idx (updated_by_user_id),
  CONSTRAINT membership_recruitment_creator_fk FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT membership_recruitment_updater_fk FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS membership_applications (
  id VARCHAR(64) PRIMARY KEY,
  reference VARCHAR(80) NOT NULL,
  recruitment_period_id VARCHAR(64) NULL,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  city VARCHAR(120) NOT NULL,
  institution VARCHAR(200) NOT NULL,
  program VARCHAR(200) NOT NULL,
  contribution DECIMAL(12,2) NOT NULL DEFAULT 0,
  motivation TEXT NOT NULL,
  photo MEDIUMTEXT NULL,
  cv_name VARCHAR(255) NULL,
  consent TINYINT(1) NOT NULL,
  status ENUM('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY membership_applications_reference_unique (reference),
  KEY membership_applications_email_idx (email),
  KEY membership_applications_status_idx (status),
  KEY membership_applications_recruitment_idx (recruitment_period_id, status, created_at),
  CONSTRAINT membership_applications_recruitment_fk FOREIGN KEY (recruitment_period_id) REFERENCES membership_recruitment_periods(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(160) NOT NULL,
  title_en VARCHAR(240) NOT NULL,
  title_ar VARCHAR(240) NOT NULL,
  excerpt_en TEXT NOT NULL,
  excerpt_ar TEXT NOT NULL,
  content_en LONGTEXT NOT NULL,
  content_ar LONGTEXT NOT NULL,
  category VARCHAR(120) NOT NULL,
  cover_path MEDIUMTEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY posts_slug_unique (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_items (
  id VARCHAR(64) PRIMARY KEY,
  media_type ENUM('PHOTO','VIDEO') NOT NULL,
  file_path MEDIUMTEXT NOT NULL,
  title_en VARCHAR(240) NOT NULL,
  title_ar VARCHAR(240) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsors (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  level ENUM('GOLD','SILVER','BRONZE','PARTNER') NOT NULL DEFAULT 'PARTNER',
  logo_path MEDIUMTEXT NOT NULL,
  website_url VARCHAR(500) NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_invitations (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL,
  member_id VARCHAR(64) NOT NULL,
  status ENUM('PENDING','ACCEPTED','REJECTED','REASSIGNED') NOT NULL DEFAULT 'PENDING',
  reason VARCHAR(500) NULL,
  responded_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY event_invitations_event_idx (event_id),
  KEY event_invitations_member_idx (member_id),
  CONSTRAINT event_invitations_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT event_invitations_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS donations (
  id VARCHAR(64) PRIMARY KEY,
  public_id VARCHAR(80) NOT NULL,
  context ENUM('membership_completed','page_bottom','manual') NOT NULL DEFAULT 'manual',
  source_page VARCHAR(240) NULL,
  event_id VARCHAR(64) NULL,
  membership_request_id VARCHAR(64) NULL,
  member_id VARCHAR(64) NULL,
  donor_name VARCHAR(160) NULL,
  donor_email_normalized VARCHAR(190) NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  payment_provider VARCHAR(40) NOT NULL DEFAULT 'paypal',
  provider_order_id VARCHAR(160) NULL,
  provider_capture_id VARCHAR(160) NULL,
  status ENUM('initiated','pending','captured','failed','cancelled','expired','refunded') NOT NULL DEFAULT 'initiated',
  is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  paid_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY donations_public_id_unique (public_id),
  UNIQUE KEY donations_provider_order_unique (provider_order_id),
  KEY donations_context_idx (context),
  KEY donations_status_idx (status),
  KEY donations_created_idx (created_at),
  KEY donations_amount_idx (amount),
  KEY donations_event_idx (event_id),
  KEY donations_membership_idx (membership_request_id),
  KEY donations_member_idx (member_id),
  KEY donations_email_idx (donor_email_normalized),
  CONSTRAINT donations_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  CONSTRAINT donations_membership_fk FOREIGN KEY (membership_request_id) REFERENCES membership_applications(id) ON DELETE SET NULL,
  CONSTRAINT donations_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS donation_events (
  id VARCHAR(64) PRIMARY KEY,
  donation_id VARCHAR(64) NULL,
  event_name ENUM('donation_popup_shown','donation_popup_closed','donation_popup_later','donation_popup_declined','donation_amount_selected','donation_payment_started','donation_payment_completed','donation_payment_failed') NOT NULL,
  context VARCHAR(80) NULL,
  source_page VARCHAR(240) NULL,
  event_id VARCHAR(64) NULL,
  membership_request_id VARCHAR(64) NULL,
  selected_amount_category VARCHAR(80) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY donation_events_name_idx (event_name, created_at),
  KEY donation_events_context_idx (context, created_at),
  KEY donation_events_donation_idx (donation_id),
  CONSTRAINT donation_events_donation_fk FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  member_id VARCHAR(64) NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY notifications_user_idx (user_id, read_at),
  KEY notifications_member_idx (member_id, read_at),
  CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT notifications_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_user_id VARCHAR(64) NULL,
  actor_label VARCHAR(190) NOT NULL,
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100) NULL,
  success TINYINT(1) NOT NULL DEFAULT 1,
  detail TEXT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY audit_logs_actor_idx (actor_user_id),
  KEY audit_logs_resource_idx (resource_type, resource_id),
  KEY audit_logs_created_idx (created_at),
  CONSTRAINT audit_logs_actor_fk FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
