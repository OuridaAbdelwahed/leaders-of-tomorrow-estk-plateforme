-- Optional donation pop-up system. Donations are independent from membership and tickets.

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

INSERT INTO permissions (name, description) VALUES
  ('donations.view', 'View donation dashboard and donation records'),
  ('donations.manage', 'Manage donation pop-up configuration')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_super_admin', id FROM permissions WHERE name IN ('donations.view','donations.manage');

INSERT INTO settings (setting_key, setting_value, is_public) VALUES
  ('donations.enabled', 'true', 1),
  ('donations.trigger.membership_completed', 'true', 1),
  ('donations.trigger.page_bottom', 'true', 1),
  ('donations.eligible_pages', '["/","/events","/gallery","/contact","/join"]', 1),
  ('donations.scroll_threshold', '90', 1),
  ('donations.suggested_amounts', '[5,10,20,50]', 1),
  ('donations.maximum_amount', '10000', 1),
  ('donations.currency', 'USD', 1),
  ('donations.title', 'Support the growth of our club', 1),
  ('donations.description', 'Your donation is completely optional. It helps the club grow, improve its services, and organize more activities, events, and initiatives for our members.', 1),
  ('donations.later_days', '7', 1),
  ('donations.declined_days', '30', 1),
  ('donations.donor_days', '90', 1),
  ('donations.session_limit', '1', 1),
  ('donations.anonymous_available', 'true', 1)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), is_public = VALUES(is_public);
