# Internal multilingual club assistant

## Purpose and boundaries

The Leaders Assistant is an internal, deterministic support module for the Leaders of Tomorrow platform. It does not send prompts, member records, or conversations to an external LLM or chatbot SaaS. Public responses come from the approved MySQL catalog; live account responses come from controlled server-side handlers.

Supported languages are Arabic, French, English, and Darija/Arabizi. The assistant covers membership, regulations, events, tickets, digital badges, invitations, notifications, sponsors, contact, privacy, and authenticated support handoff.

## Architecture

- `database/migrations/009_internal_multilingual_chatbot.sql` contains the normalized conversational schema, and `010_chatbot_knowledge_training.sql` adds approved sources, bounded text chunks, indexes, and auditable training runs.
- `scripts/seed-chatbot.mjs` idempotently installs approved intent patterns, keywords, synonyms, responses, and UI components. It never creates members, events, tickets, sponsors, or other fake business records.
- `src/features/chatbot` contains the strict versioned response contract, normalization, language detection, matching pipeline, safe action registry, and unit tests.
- `src/server/chatbotRepository.ts` owns persistence and conversation authorization.
- `src/server/chatbotService.ts` owns the allowlisted handler registry. Private handlers derive the member from the signed HTTP-only session; request payloads never choose another user.
- `src/server/chatbotKnowledgeRepository.ts` synchronizes public platform records and performs deterministic retrieval; `chatbotDocumentExtractor.ts` extracts PDF/DOCX/text and runs local Arabic, French, or English OCR.
- `src/app/api/chatbot` provides the public REST boundary.
- `src/components/chatbot` renders the lazy-loaded, responsive, accessible widget.
- `src/components/admin/chatbot` provides the super-admin catalog, analytics, unresolved-question, handoff, settings, and matching-test workspace.

## Matching pipeline

1. Detect or accept an enabled language.
2. Normalize Unicode, Arabic variants, punctuation, accents, and a cautious set of common Arabizi terms.
3. Expand database synonyms.
4. Score exact/sample/fuzzy patterns, weighted keywords, required terms, negative terms, language coverage, and intent priority.
5. Apply each intent's minimum confidence and ambiguity margin.
6. Resolve authentication and role requirements.
7. Execute only an allowlisted handler or use an approved static response.
8. If no approved intent matches, retrieve relevant active chunks from the approved knowledge index.
9. Validate the complete response with the strict `ChatbotResponse` Zod schema before returning or storing it.

Unknown messages are recorded in the unresolved inbox only when conversation storage is enabled. The assistant does not improvise an answer.

## Public API

- `GET /api/chatbot/config` — safe public runtime configuration.
- `POST /api/chatbot/message` — validated, rate-limited deterministic response.
- `POST /api/chatbot/feedback` — helpful/not-helpful feedback owned by the current actor.
- `POST /api/chatbot/handoffs` — authenticated member support escalation.
- `GET /api/chatbot/conversations/:id` — current actor's limited history.
- `DELETE /api/chatbot/conversations/:id` — current actor's conversation deletion.

Mutation requests require a verifiable same-origin browser request. Guest sessions use a random HTTP-only cookie and store only its SHA-256 hash. Member and administrator identity is resolved from signed sessions.

## Super-admin API

All `/api/admin/chatbot` routes require a super-admin session. They expose analytics, runtime settings, catalog CRUD, unresolved/handoff status changes, a non-persisting matching test, and the knowledge-training studio. `GET/POST /api/admin/chatbot/knowledge` lists sources, synchronizes public content, accepts raw text, or extracts an uploaded file. `PATCH/DELETE /api/admin/chatbot/knowledge/:id` controls or removes imported sources. Mutation routes require same-origin requests and training operations are rate-limited.

## Knowledge training and automatic updates

“Training” means indexing approved text for deterministic retrieval; it does not fine-tune a model and does not transmit content to an external AI provider.

- Automatic sync covers published events, posts/features, gallery titles, active sponsor profiles, and active public offer descriptions. Store-backed content changes and sponsorship/coupon mutations queue a refresh; query-time freshness checking is a safety net.
- Private member profiles, applications, tickets, QR data, payments, coupon codes, internal sponsor notes, and administrator records are never copied into the public index.
- Super admins can import PDF, DOCX, JPEG, PNG, WebP, TXT, CSV, JSON, HTML, Markdown, or raw text. Uploaded binary files are processed transiently; only extracted text, a checksum, metadata, and chunks are retained.
- OCR uses bundled local language data. No CDN is required at extraction time.
- WhatsApp, Instagram, and TikTok support accepts user-provided export files only. It never asks for social account credentials. Conversation text is de-identified before indexing by stripping common sender labels, phone numbers, emails, links, and secret-like values.
- Imported sources default to inactive. A super admin must explicitly publish them to the public assistant.

## Privacy and security

- Password-like values, bearer-like secrets, long tokens, and payment-card-like digit sequences are masked before message storage.
- Ticket QR secrets and member password hashes are never placed in chatbot responses.
- Conversation history is checked against the current member/admin/hashed guest actor.
- Database queries are parameterized. Dynamic table/column names exist only behind fixed internal maps.
- Message length, per-minute limits, guest hourly limits, catalog component limits, and strict Zod parsing constrain abuse.
- The guest conversation switch and retention days are configurable by super admin or environment override.
- Human handoff is limited to signed-in members and stores a short deterministic summary, not a generated interpretation.
- The client accepts only allowlisted action keys; response payloads cannot inject raw navigation URLs or executable HTML.
- File type magic, size, image format, pixel count, text length, source type, and language are validated. Legacy `.doc` files and executable/archive uploads are rejected.

Users should not send passwords, payment secrets, or private QR codes in chat. The privacy policy and internal regulations remain authoritative.

## Installation and deployment

From the project root:

```bash
npm run db:migrate
npm run chatbot:seed
npm test
npm run build
```

The seed command is safe to rerun. It refreshes the official seed intents and their dependent patterns/responses/components while preserving conversations, feedback, handoffs, unresolved questions, settings changed by administrators, and custom intents with other keys.

For production, set a strong `SESSION_SECRET`, production database credentials, trusted `SITE_URL`, secure cookies, and the desired `CHATBOT_*` overrides. Keep `CHATBOT_SEMANTIC_MATCHING_ENABLED=false`; it is only a reserved interface for a future reviewed internal implementation.

## Operations

Open **Operations console → Assistant** as a super administrator.

- Overview shows real conversations, messages, confidence, feedback, open questions, handoffs, used intents, and audited changes.
- Knowledge catalog manages intents, patterns, keywords, responses, structured components, suggestions, and synonyms.
- Training studio synchronizes public platform data, imports approved documents or conversation exports, shows real indexing status, and controls which imported sources are available to users.
- Unanswered is the real unmatched-question inbox.
- Handoffs tracks member support requests.
- Test console explains the selected intent, confidence, score breakdown, and alternatives without creating a conversation.
- Settings control enablement, guest storage, handoff, language, limits, and retention.

Changes take effect after the runtime catalog cache is invalidated automatically. Direct database changes can take up to 60 seconds unless the application restarts.

## Rollback

1. Immediately disable the assistant with `CHATBOT_ENABLED=false` or the super-admin switch.
2. Revert application changes and redeploy. The widget disappears when the config is disabled.
3. Retain chatbot tables for audit/history unless the data owner has approved deletion.
4. If full schema removal is explicitly approved, back up the database and drop chatbot tables in reverse foreign-key order. Do not remove `members` or `notifications`; they are shared platform tables.

## Extending the assistant

Prefer a new database intent plus approved patterns/responses. Add server code only when a response needs live platform data. New handlers must be added to the closed handler registry, authorize the current server session, return the shared structured component types, avoid secrets, and include unit and API tests. New navigation requires an explicit `ChatActionKey` and route mapping; never store arbitrary client routes in component JSON.
