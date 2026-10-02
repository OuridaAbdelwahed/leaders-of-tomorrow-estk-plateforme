CREATE TABLE IF NOT EXISTS chatbot_settings (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL DEFAULT 'leaders_of_tomorrow',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  assistant_name VARCHAR(120) NOT NULL DEFAULT 'Leaders Assistant',
  welcome_message_ar TEXT NOT NULL,
  welcome_message_fr TEXT NOT NULL,
  welcome_message_en TEXT NOT NULL,
  welcome_message_darija TEXT NOT NULL,
  maintenance_message TEXT NULL,
  default_language ENUM('ar','fr','en','darija') NOT NULL DEFAULT 'fr',
  supported_languages JSON NOT NULL,
  max_message_length INT UNSIGNED NOT NULL DEFAULT 2000,
  history_limit INT UNSIGNED NOT NULL DEFAULT 12,
  rate_limit_per_minute INT UNSIGNED NOT NULL DEFAULT 10,
  guest_rate_limit_per_hour INT UNSIGNED NOT NULL DEFAULT 100,
  store_guest_conversations TINYINT(1) NOT NULL DEFAULT 1,
  retention_days INT UNSIGNED NOT NULL DEFAULT 90,
  human_handoff_enabled TINYINT(1) NOT NULL DEFAULT 1,
  semantic_matching_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_intents (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL DEFAULT 'leaders_of_tomorrow',
  intent_key VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  handler_type ENUM('STATIC','DATABASE','SERVICE','NAVIGATION','CLARIFICATION','AUTHENTICATION','HANDOFF') NOT NULL DEFAULT 'STATIC',
  handler_key VARCHAR(120) NULL,
  requires_authentication TINYINT(1) NOT NULL DEFAULT 0,
  allowed_roles JSON NOT NULL,
  minimum_confidence DECIMAL(4,3) NOT NULL DEFAULT 0.550,
  priority INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY chatbot_intents_key_unique (organization_id, intent_key),
  KEY chatbot_intents_active_idx (organization_id, active, category, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_patterns (
  id VARCHAR(64) PRIMARY KEY,
  intent_id VARCHAR(64) NOT NULL,
  language ENUM('ar','fr','en','darija') NOT NULL,
  pattern VARCHAR(500) NOT NULL,
  normalized_pattern VARCHAR(500) NOT NULL,
  pattern_type ENUM('EXACT','SAMPLE','FUZZY') NOT NULL DEFAULT 'SAMPLE',
  weight DECIMAL(5,2) NOT NULL DEFAULT 1,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY chatbot_patterns_unique (intent_id, language, normalized_pattern(190)),
  KEY chatbot_patterns_lookup_idx (language, active, normalized_pattern(190)),
  CONSTRAINT chatbot_patterns_intent_fk FOREIGN KEY (intent_id) REFERENCES chatbot_intents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_keywords (
  id VARCHAR(64) PRIMARY KEY,
  intent_id VARCHAR(64) NOT NULL,
  language ENUM('ar','fr','en','darija') NOT NULL,
  keyword VARCHAR(190) NOT NULL,
  normalized_keyword VARCHAR(190) NOT NULL,
  weight DECIMAL(5,2) NOT NULL DEFAULT 1,
  required TINYINT(1) NOT NULL DEFAULT 0,
  negative TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY chatbot_keywords_unique (intent_id, language, normalized_keyword, negative),
  KEY chatbot_keywords_lookup_idx (language, active, normalized_keyword),
  CONSTRAINT chatbot_keywords_intent_fk FOREIGN KEY (intent_id) REFERENCES chatbot_intents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_synonyms (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL DEFAULT 'leaders_of_tomorrow',
  language ENUM('ar','fr','en','darija') NOT NULL,
  term VARCHAR(190) NOT NULL,
  normalized_term VARCHAR(190) NOT NULL,
  synonym VARCHAR(190) NOT NULL,
  normalized_synonym VARCHAR(190) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY chatbot_synonyms_unique (organization_id, language, normalized_term, normalized_synonym),
  KEY chatbot_synonyms_lookup_idx (organization_id, language, active, normalized_term)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_responses (
  id VARCHAR(64) PRIMARY KEY,
  intent_id VARCHAR(64) NOT NULL,
  language ENUM('ar','fr','en','darija') NOT NULL,
  message TEXT NOT NULL,
  response_source ENUM('STATIC','DATABASE','SERVICE') NOT NULL DEFAULT 'STATIC',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  active TINYINT(1) NOT NULL DEFAULT 1,
  valid_from DATETIME(3) NULL,
  valid_until DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY chatbot_responses_current_idx (intent_id, language, active, version),
  CONSTRAINT chatbot_responses_intent_fk FOREIGN KEY (intent_id) REFERENCES chatbot_intents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_components (
  id VARCHAR(64) PRIMARY KEY,
  intent_id VARCHAR(64) NOT NULL,
  language ENUM('ar','fr','en','darija') NULL,
  component_type VARCHAR(80) NOT NULL,
  component_config JSON NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY chatbot_components_intent_idx (intent_id, active, display_order),
  CONSTRAINT chatbot_components_intent_fk FOREIGN KEY (intent_id) REFERENCES chatbot_intents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_suggestions (
  id VARCHAR(64) PRIMARY KEY,
  intent_id VARCHAR(64) NOT NULL,
  language ENUM('ar','fr','en','darija') NOT NULL,
  label VARCHAR(160) NOT NULL,
  message VARCHAR(500) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY chatbot_suggestions_intent_idx (intent_id, language, active, display_order),
  CONSTRAINT chatbot_suggestions_intent_fk FOREIGN KEY (intent_id) REFERENCES chatbot_intents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL DEFAULT 'leaders_of_tomorrow',
  member_id VARCHAR(64) NULL,
  admin_identity VARCHAR(190) NULL,
  guest_session_hash CHAR(64) NULL,
  language ENUM('ar','fr','en','darija') NOT NULL,
  status ENUM('OPEN','CLOSED','HANDOFF','EXPIRED') NOT NULL DEFAULT 'OPEN',
  metadata JSON NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_message_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  closed_at DATETIME(3) NULL,
  KEY chatbot_conversations_member_idx (member_id, last_message_at),
  KEY chatbot_conversations_guest_idx (guest_session_hash, last_message_at),
  KEY chatbot_conversations_status_idx (organization_id, status, last_message_at),
  CONSTRAINT chatbot_conversations_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  role ENUM('USER','ASSISTANT','SYSTEM') NOT NULL,
  original_content TEXT NOT NULL,
  normalized_content TEXT NULL,
  intent_key VARCHAR(120) NULL,
  confidence DECIMAL(5,4) NULL,
  response_payload JSON NULL,
  processing_time_ms INT UNSIGNED NULL,
  sensitive_masked TINYINT(1) NOT NULL DEFAULT 0,
  handler_error VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY chatbot_messages_conversation_idx (conversation_id, created_at),
  KEY chatbot_messages_intent_idx (intent_key, created_at),
  CONSTRAINT chatbot_messages_conversation_fk FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_unanswered_questions (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL DEFAULT 'leaders_of_tomorrow',
  conversation_id VARCHAR(64) NULL,
  message_id VARCHAR(64) NULL,
  original_question TEXT NOT NULL,
  normalized_question TEXT NOT NULL,
  question_hash CHAR(64) NOT NULL,
  detected_language ENUM('ar','fr','en','darija') NOT NULL,
  proposed_intent VARCHAR(120) NULL,
  confidence DECIMAL(5,4) NULL,
  occurrence_count INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('OPEN','RESOLVED','IGNORED','UNSUPPORTED','MERGED') NOT NULL DEFAULT 'OPEN',
  resolved_intent_id VARCHAR(64) NULL,
  resolved_by VARCHAR(190) NULL,
  resolved_at DATETIME(3) NULL,
  first_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY chatbot_unanswered_hash_unique (organization_id, question_hash),
  KEY chatbot_unanswered_status_idx (organization_id, status, last_seen_at),
  CONSTRAINT chatbot_unanswered_conversation_fk FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE SET NULL,
  CONSTRAINT chatbot_unanswered_message_fk FOREIGN KEY (message_id) REFERENCES chatbot_messages(id) ON DELETE SET NULL,
  CONSTRAINT chatbot_unanswered_intent_fk FOREIGN KEY (resolved_intent_id) REFERENCES chatbot_intents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_feedback (
  id VARCHAR(64) PRIMARY KEY,
  message_id VARCHAR(64) NOT NULL,
  member_id VARCHAR(64) NULL,
  guest_session_hash CHAR(64) NULL,
  rating ENUM('HELPFUL','NOT_HELPFUL') NOT NULL,
  comment VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY chatbot_feedback_actor_unique (message_id, member_id, guest_session_hash),
  KEY chatbot_feedback_created_idx (created_at),
  CONSTRAINT chatbot_feedback_message_fk FOREIGN KEY (message_id) REFERENCES chatbot_messages(id) ON DELETE CASCADE,
  CONSTRAINT chatbot_feedback_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_handoffs (
  id VARCHAR(64) PRIMARY KEY,
  reference VARCHAR(80) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL,
  member_id VARCHAR(64) NULL,
  category VARCHAR(100) NOT NULL,
  reason VARCHAR(1500) NOT NULL,
  summary TEXT NOT NULL,
  status ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  assigned_admin_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  resolved_at DATETIME(3) NULL,
  UNIQUE KEY chatbot_handoffs_reference_unique (reference),
  KEY chatbot_handoffs_status_idx (status, created_at),
  CONSTRAINT chatbot_handoffs_conversation_fk FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  CONSTRAINT chatbot_handoffs_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_identity VARCHAR(190) NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(64) NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY chatbot_audit_created_idx (created_at),
  KEY chatbot_audit_entity_idx (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO chatbot_settings (
  id, welcome_message_ar, welcome_message_fr, welcome_message_en, welcome_message_darija, supported_languages
) VALUES (
  'chatbot_default',
  'مرحباً! أنا مساعد نادي قادة الغد. يمكنني مساعدتك في العضوية والفعاليات والتذاكر وقواعد النادي.',
  'Bonjour ! Je suis l’assistant du club Leaders of Tomorrow. Je peux vous aider avec l’adhésion, les événements, les billets et le règlement.',
  'Hello! I am the Leaders of Tomorrow assistant. I can help with membership, events, tickets, and club rules.',
  'Salam! Ana l’assistant dyal Leaders of Tomorrow. N9der n3awnek f l’adhésion, les événements, tickets w règlement.',
  JSON_ARRAY('ar','fr','en','darija')
) ON DUPLICATE KEY UPDATE id=id;
