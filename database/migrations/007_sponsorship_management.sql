ALTER TABLE sponsors
  ADD COLUMN company_name VARCHAR(180) NULL AFTER id,
  ADD COLUMN slug VARCHAR(190) NULL AFTER company_name,
  ADD COLUMN cover_image MEDIUMTEXT NULL AFTER logo_path,
  ADD COLUMN description TEXT NULL AFTER cover_image,
  ADD COLUMN phone VARCHAR(50) NULL AFTER website_url,
  ADD COLUMN email VARCHAR(190) NULL AFTER phone,
  ADD COLUMN address VARCHAR(300) NULL AFTER email,
  ADD COLUMN city VARCHAR(120) NULL AFTER address,
  ADD COLUMN country VARCHAR(120) NULL AFTER city,
  ADD COLUMN social_links JSON NULL AFTER country,
  ADD COLUMN category VARCHAR(100) NULL AFTER social_links,
  ADD COLUMN sponsor_level ENUM('BRONZE','SILVER','GOLD','PLATINUM','PARTNER') NULL AFTER level,
  ADD COLUMN status ENUM('DRAFT','ACTIVE','PAUSED','EXPIRED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE' AFTER sponsor_level,
  ADD COLUMN verified TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0 AFTER verified,
  ADD COLUMN display_priority INT NOT NULL DEFAULT 0 AFTER featured,
  ADD COLUMN partnership_start DATETIME(3) NULL AFTER display_priority,
  ADD COLUMN partnership_end DATETIME(3) NULL AFTER partnership_start,
  ADD COLUMN notes TEXT NULL AFTER partnership_end;

UPDATE sponsors
SET company_name = COALESCE(NULLIF(company_name, ''), name),
    sponsor_level = COALESCE(sponsor_level, level),
    display_priority = IF(display_priority = 0, sort_order, display_priority),
    slug = COALESCE(NULLIF(slug, ''), LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(name, '[^A-Za-z0-9]+', '-'))));

ALTER TABLE sponsors
  ADD UNIQUE KEY sponsors_slug_unique (slug),
  ADD KEY sponsors_delivery_idx (status, active, featured, display_priority),
  ADD KEY sponsors_category_level_idx (category, sponsor_level),
  ADD KEY sponsors_partnership_end_idx (partnership_end);

CREATE TABLE IF NOT EXISTS sponsor_campaigns (
  id VARCHAR(64) PRIMARY KEY,
  sponsor_id VARCHAR(64) NOT NULL,
  campaign_name VARCHAR(180) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  description TEXT NULL,
  placement VARCHAR(80) NOT NULL,
  campaign_type VARCHAR(80) NOT NULL,
  banner_image MEDIUMTEXT NULL,
  tablet_image MEDIUMTEXT NULL,
  mobile_image MEDIUMTEXT NULL,
  target_url VARCHAR(1000) NOT NULL,
  target_behavior ENUM('SAME_TAB','NEW_TAB') NOT NULL DEFAULT 'NEW_TAB',
  qr_code MEDIUMTEXT NULL,
  start_date DATETIME(3) NOT NULL,
  end_date DATETIME(3) NOT NULL,
  max_views BIGINT UNSIGNED NULL,
  max_clicks BIGINT UNSIGNED NULL,
  current_views BIGINT UNSIGNED NOT NULL DEFAULT 0,
  current_clicks BIGINT UNSIGNED NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 0,
  weight INT UNSIGNED NOT NULL DEFAULT 1,
  active TINYINT(1) NOT NULL DEFAULT 1,
  auto_expire TINYINT(1) NOT NULL DEFAULT 1,
  popup_frequency_hours INT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY sponsor_campaigns_slug_unique (slug),
  KEY campaigns_sponsor_idx (sponsor_id, active),
  KEY campaigns_delivery_idx (placement, active, start_date, end_date, priority),
  KEY campaigns_limits_idx (current_views, current_clicks),
  CONSTRAINT campaigns_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
  CONSTRAINT campaigns_dates_check CHECK (end_date > start_date),
  CONSTRAINT campaigns_weight_check CHECK (weight > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_campaign_events (
  campaign_id VARCHAR(64) NOT NULL,
  event_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (campaign_id, event_id),
  KEY sponsor_campaign_events_event_idx (event_id, campaign_id),
  CONSTRAINT campaign_events_campaign_fk FOREIGN KEY (campaign_id) REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT campaign_events_event_fk FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_coupons (
  id VARCHAR(64) PRIMARY KEY,
  sponsor_id VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  description TEXT NULL,
  coupon_code VARCHAR(100) NOT NULL,
  discount_type ENUM('PERCENTAGE','FIXED','CUSTOM') NOT NULL,
  percentage DECIMAL(5,2) NULL,
  fixed_amount DECIMAL(12,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MAD',
  minimum_purchase DECIMAL(12,2) NULL,
  expiration_date DATETIME(3) NOT NULL,
  usage_limit INT UNSIGNED NULL,
  current_usage INT UNSIGNED NOT NULL DEFAULT 0,
  terms TEXT NULL,
  category VARCHAR(100) NOT NULL,
  redemption_url VARCHAR(1000) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY sponsor_coupons_slug_unique (slug),
  KEY coupons_sponsor_idx (sponsor_id, active),
  KEY coupons_delivery_idx (active, category, expiration_date),
  CONSTRAINT coupons_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
  CONSTRAINT coupons_percentage_check CHECK (percentage IS NULL OR (percentage > 0 AND percentage <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_coupon_favorites (
  coupon_id VARCHAR(64) NOT NULL,
  member_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (coupon_id, member_id),
  CONSTRAINT coupon_favorites_coupon_fk FOREIGN KEY (coupon_id) REFERENCES sponsor_coupons(id) ON DELETE CASCADE,
  CONSTRAINT coupon_favorites_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_impressions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sponsor_id VARCHAR(64) NOT NULL,
  campaign_id VARCHAR(64) NOT NULL,
  member_id VARCHAR(64) NULL,
  device_id_hash CHAR(64) NOT NULL,
  page VARCHAR(500) NOT NULL,
  placement VARCHAR(80) NOT NULL,
  source ENUM('WEB','QR') NOT NULL DEFAULT 'WEB',
  ip_hash CHAR(64) NOT NULL,
  country VARCHAR(120) NULL,
  city VARCHAR(120) NULL,
  device_type VARCHAR(40) NULL,
  browser VARCHAR(80) NULL,
  operating_system VARCHAR(80) NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  dedupe_bucket BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY impressions_dedupe_unique (campaign_id, device_id_hash, page(120), dedupe_bucket, source),
  KEY impressions_campaign_date_idx (campaign_id, occurred_at),
  KEY impressions_sponsor_date_idx (sponsor_id, occurred_at),
  KEY impressions_analytics_idx (occurred_at, placement, device_type),
  CONSTRAINT impressions_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
  CONSTRAINT impressions_campaign_fk FOREIGN KEY (campaign_id) REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT impressions_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_clicks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sponsor_id VARCHAR(64) NOT NULL,
  campaign_id VARCHAR(64) NOT NULL,
  member_id VARCHAR(64) NULL,
  device_id_hash CHAR(64) NOT NULL,
  page VARCHAR(500) NOT NULL,
  placement VARCHAR(80) NOT NULL,
  source ENUM('WEB','QR') NOT NULL DEFAULT 'WEB',
  ip_hash CHAR(64) NOT NULL,
  country VARCHAR(120) NULL,
  city VARCHAR(120) NULL,
  device_type VARCHAR(40) NULL,
  browser VARCHAR(80) NULL,
  operating_system VARCHAR(80) NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fraud_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  dedupe_bucket BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY clicks_dedupe_unique (campaign_id, device_id_hash, page(120), dedupe_bucket, source),
  KEY clicks_campaign_date_idx (campaign_id, occurred_at),
  KEY clicks_sponsor_date_idx (sponsor_id, occurred_at),
  KEY clicks_analytics_idx (occurred_at, placement, device_type),
  CONSTRAINT clicks_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
  CONSTRAINT clicks_campaign_fk FOREIGN KEY (campaign_id) REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT clicks_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_coupon_redemptions (
  id VARCHAR(64) PRIMARY KEY,
  coupon_id VARCHAR(64) NOT NULL,
  member_id VARCHAR(64) NULL,
  device_id_hash CHAR(64) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY redemptions_coupon_date_idx (coupon_id, occurred_at),
  CONSTRAINT redemptions_coupon_fk FOREIGN KEY (coupon_id) REFERENCES sponsor_coupons(id) ON DELETE CASCADE,
  CONSTRAINT redemptions_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_invoices (
  id VARCHAR(64) PRIMARY KEY,
  sponsor_id VARCHAR(64) NOT NULL,
  campaign_id VARCHAR(64) NULL,
  invoice_number VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'MAD',
  payment_status ENUM('DRAFT','SENT','PARTIALLY_PAID','PAID','OVERDUE','VOID') NOT NULL DEFAULT 'DRAFT',
  issued_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  due_date DATETIME(3) NOT NULL,
  paid_at DATETIME(3) NULL,
  generated_pdf MEDIUMTEXT NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY sponsor_invoices_number_unique (invoice_number),
  KEY invoices_sponsor_status_idx (sponsor_id, payment_status),
  KEY invoices_due_idx (payment_status, due_date),
  CONSTRAINT invoices_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE RESTRICT,
  CONSTRAINT invoices_campaign_fk FOREIGN KEY (campaign_id) REFERENCES sponsor_campaigns(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_payments (
  id VARCHAR(64) PRIMARY KEY,
  invoice_id VARCHAR(64) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MAD',
  method VARCHAR(80) NULL,
  reference VARCHAR(160) NULL,
  receipt_pdf MEDIUMTEXT NULL,
  paid_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY sponsor_payments_invoice_idx (invoice_id, paid_at),
  CONSTRAINT sponsor_payments_invoice_fk FOREIGN KEY (invoice_id) REFERENCES sponsor_invoices(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partnership_requests (
  id VARCHAR(64) PRIMARY KEY,
  reference VARCHAR(80) NOT NULL,
  company_name VARCHAR(180) NOT NULL,
  contact_name VARCHAR(160) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(190) NOT NULL,
  website VARCHAR(1000) NULL,
  activity VARCHAR(160) NOT NULL,
  budget DECIMAL(12,2) NULL,
  budget_currency CHAR(3) NOT NULL DEFAULT 'MAD',
  message TEXT NOT NULL,
  logo MEDIUMTEXT NULL,
  company_profile MEDIUMTEXT NULL,
  agreement_accepted TINYINT(1) NOT NULL,
  status ENUM('NEW','IN_REVIEW','CHANGES_REQUESTED','ACCEPTED','REJECTED','CONVERTED') NOT NULL DEFAULT 'NEW',
  admin_notes TEXT NULL,
  converted_sponsor_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY partnership_requests_reference_unique (reference),
  KEY partnership_requests_status_date_idx (status, created_at),
  KEY partnership_requests_email_idx (email),
  CONSTRAINT partnership_request_sponsor_fk FOREIGN KEY (converted_sponsor_id) REFERENCES sponsors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_qr_codes (
  id VARCHAR(64) PRIMARY KEY,
  sponsor_id VARCHAR(64) NOT NULL,
  campaign_id VARCHAR(64) NULL,
  coupon_id VARCHAR(64) NULL,
  format ENUM('POSTER','FLYER','STICKER','BUSINESS_CARD') NOT NULL,
  destination_type ENUM('CAMPAIGN','SPONSOR','OFFER','TRACKING_LINK') NOT NULL,
  destination_url VARCHAR(1000) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  design JSON NULL,
  qr_data_url MEDIUMTEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  scan_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY sponsor_qr_token_unique (token_hash),
  KEY sponsor_qr_sponsor_idx (sponsor_id, active),
  KEY sponsor_qr_campaign_idx (campaign_id),
  CONSTRAINT sponsor_qr_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
  CONSTRAINT sponsor_qr_campaign_fk FOREIGN KEY (campaign_id) REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT sponsor_qr_coupon_fk FOREIGN KEY (coupon_id) REFERENCES sponsor_coupons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_gallery (
  id VARCHAR(64) PRIMARY KEY,
  sponsor_id VARCHAR(64) NOT NULL,
  media_type ENUM('IMAGE','VIDEO') NOT NULL,
  media_path MEDIUMTEXT NOT NULL,
  alt_text VARCHAR(300) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY sponsor_gallery_order_idx (sponsor_id, sort_order),
  CONSTRAINT sponsor_gallery_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsor_contracts (
  id VARCHAR(64) PRIMARY KEY,
  sponsor_id VARCHAR(64) NOT NULL,
  contract_number VARCHAR(100) NOT NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MAD',
  status ENUM('DRAFT','AWAITING_SIGNATURE','ACTIVE','EXPIRED','TERMINATED') NOT NULL DEFAULT 'DRAFT',
  generated_pdf MEDIUMTEXT NULL,
  signed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY sponsor_contract_number_unique (contract_number),
  KEY sponsor_contract_expiry_idx (status, ends_at),
  CONSTRAINT sponsor_contract_sponsor_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE RESTRICT,
  CONSTRAINT sponsor_contract_dates_check CHECK (ends_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsorship_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_by VARCHAR(64) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT sponsorship_settings_user_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsorship_activities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor VARCHAR(190) NOT NULL,
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id VARCHAR(64) NULL,
  detail VARCHAR(1000) NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY sponsorship_activities_date_idx (occurred_at),
  KEY sponsorship_activities_resource_idx (resource_type, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sponsorship_notification_outbox (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  notification_type VARCHAR(100) NOT NULL,
  recipient VARCHAR(190) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  scheduled_at DATETIME(3) NOT NULL,
  sent_at DATETIME(3) NULL,
  last_error VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY sponsorship_notifications_queue_idx (status, scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (name, description) VALUES
  ('sponsorship.view', 'View sponsorship operations and analytics'),
  ('sponsorship.manage', 'Manage sponsors, campaigns, coupons, requests, placements, QR codes, and settings'),
  ('sponsorship.finance', 'Manage sponsorship invoices, payments, receipts, and contracts')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_super_admin', id FROM permissions WHERE name LIKE 'sponsorship.%';

INSERT INTO sponsorship_settings (setting_key, setting_value) VALUES
  ('delivery', JSON_OBJECT('defaultBannerDurationSeconds', 7, 'popupFrequencyHours', 24, 'carouselSpeedSeconds', 6, 'avoidRepeatWindowMinutes', 30)),
  ('coupons', JSON_OBJECT('defaultValidityDays', 30, 'allowFavorites', true, 'requireMemberForRedemption', false)),
  ('invoices', JSON_OBJECT('prefix', 'LOT-SP', 'nextNumber', 1, 'defaultCurrency', 'MAD', 'defaultDueDays', 30)),
  ('qr', JSON_OBJECT('foreground', '#0B3F47', 'background', '#FFFFFF', 'errorCorrectionLevel', 'H', 'margin', 2)),
  ('packages', JSON_ARRAY()),
  ('analytics', JSON_OBJECT('retentionDays', 730, 'uniqueViewWindowMinutes', 30))
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
