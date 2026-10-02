CREATE TABLE membership_recruitment_periods (
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

INSERT INTO membership_recruitment_periods (id,title_en,title_ar,opens_at,closes_at,enabled)
VALUES ('recruitment_default','Open membership applications','طلبات العضوية مفتوحة',UTC_TIMESTAMP(3),NULL,1);

ALTER TABLE membership_applications
  ADD COLUMN recruitment_period_id VARCHAR(64) NULL AFTER reference,
  ADD KEY membership_applications_recruitment_idx (recruitment_period_id, status, created_at),
  ADD CONSTRAINT membership_applications_recruitment_fk FOREIGN KEY (recruitment_period_id) REFERENCES membership_recruitment_periods(id) ON DELETE SET NULL;
