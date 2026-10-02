-- Keep donation prompts English-only and use a PayPal Checkout supported currency.
-- PayPal does not support MAD for Checkout payments, so the local default is USD.

INSERT INTO settings (setting_key, setting_value, is_public) VALUES
  ('donations.currency', 'USD', 1),
  ('donations.suggested_amounts', '[5,10,20,50]', 1),
  ('donations.title', 'Support the growth of our club', 1),
  ('donations.description', 'Your donation is completely optional. It helps the club grow, improve its services, and organize more activities, events, and initiatives for our members.', 1)
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  is_public = VALUES(is_public);
