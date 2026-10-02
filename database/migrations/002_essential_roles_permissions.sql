INSERT INTO roles (id, name, description, is_system) VALUES
  ('role_super_admin', 'Administrator', 'Full platform administration.', 1),
  ('role_scanner', 'Scanner', 'Event entrance scanning with limited ticket access.', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_system = VALUES(is_system);

INSERT INTO permissions (name, description) VALUES
  ('dashboard.view', 'View the operations dashboard'),
  ('events.view', 'View events'),
  ('events.manage', 'Create and manage events'),
  ('content.manage', 'Manage posts, gallery, and sponsors'),
  ('applications.view', 'View membership applications'),
  ('applications.manage', 'Manage membership applications'),
  ('finance.view', 'View finance information'),
  ('donations.view', 'View donation dashboard and donation records'),
  ('donations.manage', 'Manage donation pop-up configuration'),
  ('registrations.view', 'View registrations'),
  ('registrations.manage', 'Manage registrations'),
  ('tickets.view', 'View limited ticket information'),
  ('tickets.download', 'Download tickets'),
  ('tickets.scan', 'Scan and validate tickets'),
  ('scan_logs.view', 'View scan logs'),
  ('scan_logs.export', 'Export scan logs'),
  ('ticket_security.view', 'View visitor ticket verification and restriction security events'),
  ('members.view', 'View members'),
  ('members.manage', 'Manage members'),
  ('attendance.view', 'View attendance'),
  ('invitations.manage', 'Manage invitations'),
  ('audit.view', 'View audit logs'),
  ('roles.manage', 'Manage roles and administrative users')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_super_admin', id FROM permissions;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_scanner', id FROM permissions
WHERE name IN ('events.view', 'tickets.view', 'tickets.scan');

INSERT INTO settings (setting_key, setting_value, is_public) VALUES
  ('platform.name', 'New Leaders of Tomorrow', 1),
  ('platform.default_locale', 'en', 1),
  ('tickets.qr_version', '1', 0)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), is_public = VALUES(is_public);
