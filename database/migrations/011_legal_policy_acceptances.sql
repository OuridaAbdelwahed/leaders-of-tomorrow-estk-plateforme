CREATE TABLE IF NOT EXISTS legal_policy_acceptances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_type VARCHAR(40) NOT NULL,
  subject_id VARCHAR(64) NOT NULL,
  policy_slug VARCHAR(80) NOT NULL,
  policy_version VARCHAR(20) NOT NULL,
  locale VARCHAR(10) NOT NULL,
  ip_hash CHAR(64) NULL,
  accepted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_legal_acceptance (subject_type,subject_id,policy_slug,policy_version),
  KEY idx_legal_acceptance_policy (policy_slug,policy_version,accepted_at),
  KEY idx_legal_acceptance_subject (subject_type,subject_id,accepted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
