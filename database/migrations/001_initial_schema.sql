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
  participant_phone VARCHAR(50) NULL,
  participant_student_id VARCHAR(100) NULL,
  participant_program VARCHAR(240) NULL,
  ticket_code VARCHAR(100) NOT NULL,
  qr_token_hash CHAR(64) NOT NULL,
  status ENUM('ACTIVE','WAITLIST','USED','EXPIRED','CANCELLED','REFUNDED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  waitlist_position INT UNSIGNED NULL,
  valid_from DATETIME(3) NULL,
  valid_until DATETIME(3) NULL,
  used_at DATETIME(3) NULL,
  used_by_user_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY tickets_ticket_code_unique (ticket_code),
  UNIQUE KEY tickets_qr_token_unique (qr_token_hash),
  KEY tickets_event_idx (event_id),
  KEY tickets_type_idx (ticket_type_id),
  KEY tickets_order_idx (order_id),
  KEY tickets_status_idx (event_id, status),
  CONSTRAINT tickets_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
  CONSTRAINT tickets_type_fk FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT,
  CONSTRAINT tickets_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT tickets_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT tickets_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
  CONSTRAINT tickets_used_by_fk FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS membership_applications (
  id VARCHAR(64) PRIMARY KEY,
  reference VARCHAR(80) NOT NULL,
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
  KEY membership_applications_status_idx (status)
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
