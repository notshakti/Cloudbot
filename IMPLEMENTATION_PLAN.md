# CloudBot – Implementation plan (all phases)

High-level roadmap of what’s done and what’s left. Use this to track progress and plan next phases.

---

## Phase 1: Foundation (backend) — **DONE**

- [x] Project structure, TypeScript, env config
- [x] MongoDB connection and base models (User, Organization, Bot)
- [x] Auth: signup, login, refresh token (JWT) + middleware
- [x] Org and Bot CRUD with org-scoped access
- [x] Plan limits (currently set to “unlimited” for all plans)

---

## Phase 2: Core bot features (backend) — **DONE**

- [x] Intent model (training phrases, responses)
- [x] Knowledge base model (documents, URLs, FAQs)
- [x] Document processing (PDF, DOCX, TXT, CSV, URL scrape)
- [x] KB APIs: list, upload, add URL, add FAQ, search
- [x] Bot test endpoint (`POST /bots/:botId/test`)

---

## Phase 3: Training & NLP (backend) + dashboard (frontend) — **DONE**

- [x] UnrecognizedQuery model and endpoints
- [x] Training: status, validate, bulk intent create/import/export
- [x] Unrecognized-query list, convert to intent, dismiss
- [x] NLP service used by test + chat
- [x] Frontend: Auth (login/signup), Dashboard, Bot detail (Overview, Intents, KB, Test)

---

## Phase 4: Conversations (backend) — **DONE**

- [x] Conversation model (session, messages, feedback)
- [x] Public chat API: start, message, history, end, feedback
- [x] Conversations stored and linked to NLP responses

---

## Phase 5: Multi-channel — **DONE**

- [x] Embed code endpoint
- [x] Channel config API (get/update web, WhatsApp, Facebook, Slack)
- [x] Webhooks: WhatsApp, Facebook, Slack (verify + receive)
- [x] Channel-specific formatting and send (Twilio, Graph API, Slack API)
- [x] Dashboard: Channels tab (embed + credentials)

---

## Phase 6: Analytics — **DONE**

- [x] `GET /bots/:botId/analytics` (conversations, messages, rating, messages-by-day)
- [x] Dashboard: Analytics tab with cards and simple chart

---

## Phase 7: Advanced features — **DONE**

- [x] Human handoff: escalate endpoint, conversation status `escalated`, resolve (takeover)
- [x] Lead capture: Lead model, capture API, list leads, Overview toggles
- [x] A/B response variations in NLP (random pick from intent variations)
- [x] Bot config: `features` (humanHandoff, leadCapture), `languages`, `integrations.crm` stub
- [x] Templates: `GET /templates`, `POST /bots/from-template/:templateId`
- [x] Dashboard: Conversations tab, Leads tab, Phase 7 toggles in Overview
- [ ] **Optional later:** Full CRM sync (Salesforce/HubSpot), multi-language detection, voice bot

---

## Phase 7.5: LLM-First Hybrid Architecture — **DONE (Phase 1)**

- [x] Bot config: `config.aiMode` (`llm_first` | `hybrid` | `intent_only`), `config.aiConfig` (primaryLLM, temperature, maxTokens, ragEnabled, fallbackToIntent)
- [x] RAG service: `getRelevantKnowledgeChunks(botId, query, limit)` using existing KB + keyword/fuzzy match (no vector DB)
- [x] LLM Brain service: OpenAI integration, system prompt from bot + RAG chunks, `generateLLMResponse()`, graceful fallback when no API key
- [x] Message router: `routeAndRespond(botId, message, sessionId)` — LLM-first / hybrid / intent-only; conversation context loader
- [x] Chat flow: `POST /api/chat/:botId/message` and `POST /api/bots/:botId/test` use router (LLM or intent)
- [x] Dedicated AI endpoint: `POST /api/chat/:botId/ai-message` (body: message, sessionId?, stream?) — always LLM when key set
- [x] Dashboard: Overview tab — AI mode selector (LLM-first, Hybrid, Intent-only)
- [ ] **Next:** Streaming (SSE), workflow engine (n8n), optional Pinecone/vector DB, auto-learning from conversations

---

## Phase 8: Admin dashboard & polish — **PARTIAL**

- [x] Org-scoped dashboard, bot list, create (purpose-based + from-template)
- [x] Bot detail tabs: Overview, Intents, KB, Channels, Conversations, Leads, Analytics, Test
- [ ] Team members (invite, roles) — **TODO**
- [ ] API keys (org) — **TODO**
- [ ] Billing/usage UI (plans, usage) — **TODO**
- [ ] Org settings page — **TODO**

---

## Phase 9: DevOps & deployment — **TODO**

- [ ] Dockerfile and run instructions
- [ ] Env-based config (staging/prod)
- [ ] Health/readiness endpoints
- [ ] Logging and error reporting
- [ ] Optional: CI/CD (e.g. GitHub Actions), deploy to Cloud Run / similar

---

## Phase 10: Testing & launch — **TODO**

- [ ] Unit tests (auth, NLP, key services)
- [ ] Integration tests (API routes)
- [ ] E2E or critical-path tests (login → create bot → test chat)
- [ ] Load/smoke tests for chat and webhooks
- [ ] Security review (auth, rate limits, input validation)
- [ ] Docs: API overview, env vars, runbook

---

## Suggested order for “next phase”

1. **Phase 8 (admin polish):** Team members, API keys, billing/usage UI, org settings.
2. **Phase 9 (DevOps):** Docker, env config, health, logging, optional CI/CD.
3. **Phase 10 (testing):** Tests and docs.

If you say which phase you want next (e.g. “Phase 8” or “team members + API keys”), we can break it into concrete tasks and implement step by step.
