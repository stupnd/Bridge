# Commit Log

Automatically updated by the `commit-log` GitHub Action on every push to `main`. Newest first.

### 2026-11-13 08:22 — Stuti Pandya · [`dc2e9a1`](https://github.com/stupnd/Bridge/commit/dc2e9a1404a4c2b1e89bf06b5c2d7227ec4ad780) · pushed by @stupnd

**Merge pull request #9 from stupnd/feature/ui-redesign**

Add collected ASL data and project documentation; ignore .DS_Store

Files changed (62):
- `.DS_Store` (binary)
- `.agents/skills/supabase-postgres-best-practices/AGENTS.md` (+0 / −68)
- `.agents/skills/supabase-postgres-best-practices/CLAUDE.md` (+0 / −68)
- `.agents/skills/supabase-postgres-best-practices/README.md` (+0 / −116)
- `.agents/skills/supabase-postgres-best-practices/SKILL.md` (+0 / −64)
- `.agents/skills/supabase-postgres-best-practices/references/_contributing.md` (+0 / −171)
- `.agents/skills/supabase-postgres-best-practices/references/_sections.md` (+0 / −39)
- `.agents/skills/supabase-postgres-best-practices/references/_template.md` (+0 / −34)
- `.agents/skills/supabase-postgres-best-practices/references/advanced-full-text-search.md` (+0 / −55)
- `.agents/skills/supabase-postgres-best-practices/references/advanced-jsonb-indexing.md` (+0 / −49)
- `.agents/skills/supabase-postgres-best-practices/references/conn-idle-timeout.md` (+0 / −46)
- `.agents/skills/supabase-postgres-best-practices/references/conn-limits.md` (+0 / −44)
- `.agents/skills/supabase-postgres-best-practices/references/conn-pooling.md` (+0 / −41)
- `.agents/skills/supabase-postgres-best-practices/references/conn-prepared-statements.md` (+0 / −46)
- `.agents/skills/supabase-postgres-best-practices/references/data-batch-inserts.md` (+0 / −54)
- `.agents/skills/supabase-postgres-best-practices/references/data-n-plus-one.md` (+0 / −53)
- `.agents/skills/supabase-postgres-best-practices/references/data-pagination.md` (+0 / −50)
- `.agents/skills/supabase-postgres-best-practices/references/data-upsert.md` (+0 / −50)
- `.agents/skills/supabase-postgres-best-practices/references/lock-advisory.md` (+0 / −56)
- `.agents/skills/supabase-postgres-best-practices/references/lock-deadlock-prevention.md` (+0 / −68)
- `.agents/skills/supabase-postgres-best-practices/references/lock-short-transactions.md` (+0 / −50)
- `.agents/skills/supabase-postgres-best-practices/references/lock-skip-locked.md` (+0 / −54)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-explain-analyze.md` (+0 / −45)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-pg-stat-statements.md` (+0 / −55)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-vacuum-analyze.md` (+0 / −55)
- `.agents/skills/supabase-postgres-best-practices/references/query-composite-indexes.md` (+0 / −44)
- `.agents/skills/supabase-postgres-best-practices/references/query-covering-indexes.md` (+0 / −40)
- `.agents/skills/supabase-postgres-best-practices/references/query-index-types.md` (+0 / −48)
- `.agents/skills/supabase-postgres-best-practices/references/query-missing-indexes.md` (+0 / −43)
- `.agents/skills/supabase-postgres-best-practices/references/query-partial-indexes.md` (+0 / −45)
- `.agents/skills/supabase-postgres-best-practices/references/schema-constraints.md` (+0 / −80)
- `.agents/skills/supabase-postgres-best-practices/references/schema-data-types.md` (+0 / −46)
- `.agents/skills/supabase-postgres-best-practices/references/schema-foreign-key-indexes.md` (+0 / −59)
- `.agents/skills/supabase-postgres-best-practices/references/schema-lowercase-identifiers.md` (+0 / −55)
- `.agents/skills/supabase-postgres-best-practices/references/schema-partitioning.md` (+0 / −55)
- `.agents/skills/supabase-postgres-best-practices/references/schema-primary-keys.md` (+0 / −61)
- `.agents/skills/supabase-postgres-best-practices/references/security-privileges.md` (+0 / −54)
- `.agents/skills/supabase-postgres-best-practices/references/security-rls-basics.md` (+0 / −50)
- `.agents/skills/supabase-postgres-best-practices/references/security-rls-performance.md` (+0 / −57)
- `.gitignore` (+5 / −0)
- `data_collected/asl-calibration-2026-10-24T17-43-43-538Z.csv` (+2 / −0)
- `data_collected/asl-calibration-2026-10-24T17-43-51-905Z copy.csv` (+2 / −0)
- `data_collected/asl-calibration-2026-10-24T17-43-51-905Z.csv` (+2 / −0)
- `data_collected/asl-calibration-2026-10-24T17-58-56-004Z.csv` (+2 / −0)
- `data_collected/asl-frames-2026-10-24T17-43-43-538Z.csv` (+401 / −0)
- `data_collected/asl-frames-2026-10-24T17-43-51-905Z copy.csv` (+401 / −0)
- `data_collected/asl-frames-2026-10-24T17-43-51-905Z.csv` (+401 / −0)
- `data_collected/asl-frames-2026-10-24T17-58-56-004Z.csv` (+2592 / −0)
- `data_collected/asl-samples-2026-10-09T14-36-04-514Z.csv` (+25 / −0)
- `documentation/Bridge-diagram-prompt-simple.txt` (+42 / −0)
- `documentation/Bridge-diagram-prompt.txt` (+47 / −0)
- `documentation/Bridge-midterm-breakdown.md` (+240 / −0)
- `documentation/Bridge-report-browser-prompt.txt` (+53 / −0)
- `documentation/Bridge-report-updates.docx` (binary)
- `documentation/Bridge-report-updates.html` (+180 / −0)
- `documentation/CEG4913_Midterm Pres.pptx` (binary)
- `documentation/CEG4913_Midterm_Pres_updated(1).pptx` (binary)
- `documentation/CEG4913_Midterm_Pres_updated.pptx` (binary)
- `documentation/Midterm Report - Bridge (1).pdf` (binary)
- `"documentation/capstone meetings \342\200\223 2026_10_20 16_00 EDT \342\200\223 Notes by Gemini.docx"` (binary)
- `"documentation/capstone pitch meeting \342\200\223 2026_09_21 15_28 EDT \342\200\223 Notes by Gemini.docx"` (binary)
- `skills-lock.json` (+0 / −10)

### 2026-11-13 08:22 — Stuti Pandya · [`082f21f`](https://github.com/stupnd/Bridge/commit/082f21f457227976d0be821901ec1c2a800e9875) · pushed by @stupnd

**Ignore local .claude skill links**

Files changed (1):
- `.gitignore` (+1 / −0)

### 2026-11-13 08:21 — Stuti Pandya · [`8c3afcb`](https://github.com/stupnd/Bridge/commit/8c3afcb85e69dcf493b5fa2ee7fb61caaf8a929e) · pushed by @stupnd

**Ignore local agent skills and skills-lock.json**

Files changed (40):
- `.agents/skills/supabase-postgres-best-practices/AGENTS.md` (+0 / −68)
- `.agents/skills/supabase-postgres-best-practices/CLAUDE.md` (+0 / −68)
- `.agents/skills/supabase-postgres-best-practices/README.md` (+0 / −116)
- `.agents/skills/supabase-postgres-best-practices/SKILL.md` (+0 / −64)
- `.agents/skills/supabase-postgres-best-practices/references/_contributing.md` (+0 / −171)
- `.agents/skills/supabase-postgres-best-practices/references/_sections.md` (+0 / −39)
- `.agents/skills/supabase-postgres-best-practices/references/_template.md` (+0 / −34)
- `.agents/skills/supabase-postgres-best-practices/references/advanced-full-text-search.md` (+0 / −55)
- `.agents/skills/supabase-postgres-best-practices/references/advanced-jsonb-indexing.md` (+0 / −49)
- `.agents/skills/supabase-postgres-best-practices/references/conn-idle-timeout.md` (+0 / −46)
- `.agents/skills/supabase-postgres-best-practices/references/conn-limits.md` (+0 / −44)
- `.agents/skills/supabase-postgres-best-practices/references/conn-pooling.md` (+0 / −41)
- `.agents/skills/supabase-postgres-best-practices/references/conn-prepared-statements.md` (+0 / −46)
- `.agents/skills/supabase-postgres-best-practices/references/data-batch-inserts.md` (+0 / −54)
- `.agents/skills/supabase-postgres-best-practices/references/data-n-plus-one.md` (+0 / −53)
- `.agents/skills/supabase-postgres-best-practices/references/data-pagination.md` (+0 / −50)
- `.agents/skills/supabase-postgres-best-practices/references/data-upsert.md` (+0 / −50)
- `.agents/skills/supabase-postgres-best-practices/references/lock-advisory.md` (+0 / −56)
- `.agents/skills/supabase-postgres-best-practices/references/lock-deadlock-prevention.md` (+0 / −68)
- `.agents/skills/supabase-postgres-best-practices/references/lock-short-transactions.md` (+0 / −50)
- `.agents/skills/supabase-postgres-best-practices/references/lock-skip-locked.md` (+0 / −54)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-explain-analyze.md` (+0 / −45)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-pg-stat-statements.md` (+0 / −55)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-vacuum-analyze.md` (+0 / −55)
- `.agents/skills/supabase-postgres-best-practices/references/query-composite-indexes.md` (+0 / −44)
- `.agents/skills/supabase-postgres-best-practices/references/query-covering-indexes.md` (+0 / −40)
- `.agents/skills/supabase-postgres-best-practices/references/query-index-types.md` (+0 / −48)
- `.agents/skills/supabase-postgres-best-practices/references/query-missing-indexes.md` (+0 / −43)
- `.agents/skills/supabase-postgres-best-practices/references/query-partial-indexes.md` (+0 / −45)
- `.agents/skills/supabase-postgres-best-practices/references/schema-constraints.md` (+0 / −80)
- `.agents/skills/supabase-postgres-best-practices/references/schema-data-types.md` (+0 / −46)
- `.agents/skills/supabase-postgres-best-practices/references/schema-foreign-key-indexes.md` (+0 / −59)
- `.agents/skills/supabase-postgres-best-practices/references/schema-lowercase-identifiers.md` (+0 / −55)
- `.agents/skills/supabase-postgres-best-practices/references/schema-partitioning.md` (+0 / −55)
- `.agents/skills/supabase-postgres-best-practices/references/schema-primary-keys.md` (+0 / −61)
- `.agents/skills/supabase-postgres-best-practices/references/security-privileges.md` (+0 / −54)
- `.agents/skills/supabase-postgres-best-practices/references/security-rls-basics.md` (+0 / −50)
- `.agents/skills/supabase-postgres-best-practices/references/security-rls-performance.md` (+0 / −57)
- `.gitignore` (+2 / −0)
- `skills-lock.json` (+0 / −10)

### 2026-11-13 08:20 — Stuti Pandya · [`e062cb1`](https://github.com/stupnd/Bridge/commit/e062cb13ac712c27456ef3c27200c157860d8ceb) · pushed by @stupnd

**Add collected ASL data and project documentation; ignore .DS_Store**

Files changed (23):
- `.DS_Store` (binary)
- `.gitignore` (+2 / −0)
- `data_collected/asl-calibration-2026-10-24T17-43-43-538Z.csv` (+2 / −0)
- `data_collected/asl-calibration-2026-10-24T17-43-51-905Z copy.csv` (+2 / −0)
- `data_collected/asl-calibration-2026-10-24T17-43-51-905Z.csv` (+2 / −0)
- `data_collected/asl-calibration-2026-10-24T17-58-56-004Z.csv` (+2 / −0)
- `data_collected/asl-frames-2026-10-24T17-43-43-538Z.csv` (+401 / −0)
- `data_collected/asl-frames-2026-10-24T17-43-51-905Z copy.csv` (+401 / −0)
- `data_collected/asl-frames-2026-10-24T17-43-51-905Z.csv` (+401 / −0)
- `data_collected/asl-frames-2026-10-24T17-58-56-004Z.csv` (+2592 / −0)
- `data_collected/asl-samples-2026-10-09T14-36-04-514Z.csv` (+25 / −0)
- `documentation/Bridge-diagram-prompt-simple.txt` (+42 / −0)
- `documentation/Bridge-diagram-prompt.txt` (+47 / −0)
- `documentation/Bridge-midterm-breakdown.md` (+240 / −0)
- `documentation/Bridge-report-browser-prompt.txt` (+53 / −0)
- `documentation/Bridge-report-updates.docx` (binary)
- `documentation/Bridge-report-updates.html` (+180 / −0)
- `documentation/CEG4913_Midterm Pres.pptx` (binary)
- `documentation/CEG4913_Midterm_Pres_updated(1).pptx` (binary)
- `documentation/CEG4913_Midterm_Pres_updated.pptx` (binary)
- `documentation/Midterm Report - Bridge (1).pdf` (binary)
- `"documentation/capstone meetings \342\200\223 2026_10_20 16_00 EDT \342\200\223 Notes by Gemini.docx"` (binary)
- `"documentation/capstone pitch meeting \342\200\223 2026_09_21 15_28 EDT \342\200\223 Notes by Gemini.docx"` (binary)

### 2026-11-06 10:25 — Stuti Pandya · [`5e87d0d`](https://github.com/stupnd/Bridge/commit/5e87d0dffe95966b3e5a3571c1c2daf9a0b70d8f) · pushed by @stupnd

**Redesign the frontend: new landing page, login, and app pages**

Adds a landing page, wordmark, and team roadmap page, and restyles login,
translate, learn, collect, lab, glove, and profile around a shared theme.

Files changed (42):
- `.gitignore` (+4 / −0)
- `frontend/.env.capture` (+1 / −0)
- `frontend/PRODUCT.md` (+56 / −0)
- `frontend/index.html` (+4 / −1)
- `frontend/package-lock.json` (+18 / −0)
- `frontend/package.json` (+2 / −0)
- `frontend/src/app/components/Calibration.tsx` (+87 / −13)
- `frontend/src/app/components/DataCollector.tsx` (+469 / −321)
- `frontend/src/app/components/FingerBars.tsx` (+17 / −10)
- `frontend/src/app/components/GloveStatus.tsx` (+7 / −6)
- `frontend/src/app/components/HandDiagram.tsx` (+40 / −65)
- `frontend/src/app/components/Layout.tsx` (+22 / −19)
- `frontend/src/app/components/MotionLab.tsx` (+65 / −56)
- `frontend/src/app/components/ProtectedRoute.tsx` (+6 / −2)
- `frontend/src/app/components/TeachHand.tsx` (+30 / −30)
- `frontend/src/app/components/Wordmark.tsx` (+17 / −0)
- `frontend/src/app/components/common.tsx` (+35 / −40)
- `frontend/src/app/components/landing/Pipeline.tsx` (+112 / −0)
- `frontend/src/app/components/landing/SpellingHand.tsx` (+169 / −0)
- `frontend/src/app/components/landing/TryGlove.tsx` (+106 / −0)
- `frontend/src/app/components/ui/dialog.tsx` (+6 / −6)
- `frontend/src/app/content/landing.ts` (+159 / −0)
- `frontend/src/app/content/roadmap.ts` (+360 / −0)
- `frontend/src/app/context/SensorContext.tsx` (+90 / −25)
- `frontend/src/app/lib/fingers.ts` (+16 / −0)
- `frontend/src/app/lib/flexCalibrationStorage.ts` (+9 / −1)
- `frontend/src/app/lib/gloveSimulator.ts` (+3 / −2)
- `frontend/src/app/lib/handGeometry.ts` (+54 / −0)
- `frontend/src/app/lib/imu.ts` (+2 / −2)
- `frontend/src/app/pages/Collect.tsx` (+3 / −3)
- `frontend/src/app/pages/Glove.tsx` (+89 / −62)
- `frontend/src/app/pages/Lab.tsx` (+299 / −203)
- `frontend/src/app/pages/Landing.tsx` (+259 / −0)
- `frontend/src/app/pages/Learn.tsx` (+152 / −82)
- `frontend/src/app/pages/Login.tsx` (+103 / −60)
- `frontend/src/app/pages/Profile.tsx` (+127 / −24)
- `frontend/src/app/pages/Todo.tsx` (+147 / −0)
- `frontend/src/app/pages/Translate.tsx` (+134 / −42)
- `frontend/src/app/routes.tsx` (+7 / −0)
- `frontend/src/styles/theme.css` (+139 / −153)
- `frontend/src/vite-env.d.ts` (+2 / −0)
- `frontend/vite.config.ts` (+25 / −3)

### 2026-10-23 11:31 — Stuti Pandya · [`5ec7eec`](https://github.com/stupnd/Bridge/commit/5ec7eec9c97a959753fffee814ecfefc6c82d8a2) · pushed by @stupnd

**Replace prototype Supabase tables with a team-only recordings dataset**

- Migrations for team_members, recording_sessions and recordings with
  row-level security: signed-out visitors see nothing, team members read
  everything and write only their own rows
- Collect uploads each sample to the team dataset and retries anything pending
- Lab can train on the whole team's recordings
- Typed Supabase client generated from the schema

Files changed (10):
- `README.md` (+1 / −0)
- `frontend/src/app/components/DataCollector.tsx` (+99 / −2)
- `frontend/src/app/lib/collectData.ts` (+2 / −0)
- `frontend/src/app/lib/teamRecordings.ts` (+102 / −0)
- `frontend/src/app/pages/Lab.tsx` (+17 / −1)
- `frontend/src/database.types.ts` (+135 / −0)
- `frontend/src/supabaseClient.ts` (+2 / −1)
- `supabase/README.md` (+24 / −0)
- `supabase/migrations/20261023152800_recordings_schema.sql` (+125 / −0)
- `supabase/migrations/20261023152902_revoke_unused_grants.sql` (+3 / −0)

### 2026-10-23 11:15 — Stuti Pandya · [`c5db4a4`](https://github.com/stupnd/Bridge/commit/c5db4a46ec295fdf8e6cf9225e3238949edffc01) · pushed by @stupnd

**Ignore Vercel link files**

Files changed (1):
- `.gitignore` (+5 / −1)

### 2026-10-23 11:11 — Stuti Pandya · [`56f1a59`](https://github.com/stupnd/Bridge/commit/56f1a5961716406124126a845279379f5378e4f0) · pushed by @stupnd

**Clean up the frontend for deployment**

- Remove 46 unused Figma/shadcn components and 40 unused packages
- Upgrade Vite to 6.4.4; npm audit is clean
- Read Supabase settings from env vars (.env.example) instead of source
- Stop tracking build output; add Vercel SPA rewrite, favicon and page title
- Add a README and a CI check that type-checks and builds the frontend

Files changed (63):
- `.github/workflows/frontend.yml` (+29 / −0)
- `README.md` (+50 / −0)
- `frontend/.env.example` (+4 / −0)
- `frontend/.gitignore` (+3 / −0)
- `frontend/ATTRIBUTIONS.md` (+1 / −3)
- `frontend/README.md` (+0 / −11)
- `frontend/dist/assets/index-B4Zaqk_m.js` (+0 / −132)
- `frontend/dist/assets/index-LzwFKSW3.css` (+0 / −1)
- `frontend/dist/index.html` (+0 / −16)
- `frontend/guidelines/Guidelines.md` (+0 / −61)
- `frontend/index.html` (+15 / −15)
- `frontend/package-lock.json` (+453 / −2924)
- `frontend/package.json` (+7 / −64)
- `frontend/public/favicon.svg` (+1 / −0)
- `frontend/src/app/components/figma/ImageWithFallback.tsx` (+0 / −27)
- `frontend/src/app/components/ui/accordion.tsx` (+0 / −66)
- `frontend/src/app/components/ui/alert-dialog.tsx` (+0 / −157)
- `frontend/src/app/components/ui/alert.tsx` (+0 / −66)
- `frontend/src/app/components/ui/aspect-ratio.tsx` (+0 / −11)
- `frontend/src/app/components/ui/avatar.tsx` (+0 / −53)
- `frontend/src/app/components/ui/badge.tsx` (+0 / −46)
- `frontend/src/app/components/ui/breadcrumb.tsx` (+0 / −109)
- `frontend/src/app/components/ui/button.tsx` (+0 / −58)
- `frontend/src/app/components/ui/calendar.tsx` (+0 / −75)
- `frontend/src/app/components/ui/card.tsx` (+0 / −92)
- `frontend/src/app/components/ui/carousel.tsx` (+0 / −241)
- `frontend/src/app/components/ui/chart.tsx` (+0 / −353)
- `frontend/src/app/components/ui/checkbox.tsx` (+0 / −32)
- `frontend/src/app/components/ui/collapsible.tsx` (+0 / −33)
- `frontend/src/app/components/ui/command.tsx` (+0 / −177)
- `frontend/src/app/components/ui/context-menu.tsx` (+0 / −252)
- `frontend/src/app/components/ui/drawer.tsx` (+0 / −132)
- `frontend/src/app/components/ui/dropdown-menu.tsx` (+0 / −257)
- `frontend/src/app/components/ui/form.tsx` (+0 / −168)
- `frontend/src/app/components/ui/hover-card.tsx` (+0 / −44)
- `frontend/src/app/components/ui/input-otp.tsx` (+0 / −77)
- `frontend/src/app/components/ui/input.tsx` (+0 / −21)
- `frontend/src/app/components/ui/label.tsx` (+0 / −24)
- `frontend/src/app/components/ui/menubar.tsx` (+0 / −276)
- `frontend/src/app/components/ui/navigation-menu.tsx` (+0 / −168)
- `frontend/src/app/components/ui/pagination.tsx` (+0 / −127)
- `frontend/src/app/components/ui/popover.tsx` (+0 / −48)
- `frontend/src/app/components/ui/progress.tsx` (+0 / −31)
- `frontend/src/app/components/ui/radio-group.tsx` (+0 / −45)
- `frontend/src/app/components/ui/resizable.tsx` (+0 / −56)
- `frontend/src/app/components/ui/scroll-area.tsx` (+0 / −58)
- `frontend/src/app/components/ui/select.tsx` (+0 / −189)
- `frontend/src/app/components/ui/separator.tsx` (+0 / −28)
- `frontend/src/app/components/ui/sheet.tsx` (+0 / −139)
- `frontend/src/app/components/ui/sidebar.tsx` (+0 / −726)
- `frontend/src/app/components/ui/skeleton.tsx` (+0 / −13)
- `frontend/src/app/components/ui/slider.tsx` (+0 / −63)
- `frontend/src/app/components/ui/sonner.tsx` (+0 / −25)
- `frontend/src/app/components/ui/switch.tsx` (+0 / −31)
- `frontend/src/app/components/ui/table.tsx` (+0 / −116)
- `frontend/src/app/components/ui/tabs.tsx` (+0 / −66)
- `frontend/src/app/components/ui/textarea.tsx` (+0 / −18)
- `frontend/src/app/components/ui/toggle-group.tsx` (+0 / −73)
- `frontend/src/app/components/ui/toggle.tsx` (+0 / −47)
- `frontend/src/app/components/ui/tooltip.tsx` (+0 / −61)
- `frontend/src/app/components/ui/use-mobile.ts` (+0 / −21)
- `frontend/src/supabaseClient.ts` (+5 / −4)
- `frontend/vercel.json` (+4 / −0)

### 2026-10-23 10:56 — Stuti Pandya · [`01ab70a`](https://github.com/stupnd/Bridge/commit/01ab70a97e5aef34776ab46cd979e731947c3b82) · pushed by @stupnd

**Smooth predictions, flag unsure letters, and add guided hand recording**

- Translate and Learn vote over the last 300 ms so the letter doesn't flicker
- Report "unsure" (e.g. "E or S?") instead of typing when the two closest
  letters are too alike; threshold adjustable in the Lab
- Lab imports the Collect page's frames CSV and its saved samples directly
- "Teach it your hand": guided recording of every static letter for the wearer
- Robustness test separates wrong letters from unsure/no-letter results

Files changed (6):
- `frontend/src/app/components/MotionLab.tsx` (+1 / −1)
- `frontend/src/app/components/TeachHand.tsx` (+189 / −0)
- `frontend/src/app/lib/signModel.ts` (+101 / −10)
- `frontend/src/app/pages/Lab.tsx` (+60 / −10)
- `frontend/src/app/pages/Learn.tsx` (+10 / −4)
- `frontend/src/app/pages/Translate.tsx` (+14 / −12)

### 2026-10-23 10:51 — Stuti Pandya · [`1e299f3`](https://github.com/stupnd/Bridge/commit/1e299f3ae8c775187b8df9e20930d625a512eeb8) · pushed by @stupnd

**Merge main: Krisha's Collect page, Raspberry Pi TTS**

Keep Krisha's recorder (frame-by-frame capture, IndexedDB autosave, simulator)
and combine it with the shared calibration, bends and render throttling in
SensorContext. Movement Lab now reads the Collect page's samples.

Files changed (20):
- `.gitignore` (+4 / −0)
- `COMMIT_LOG.md` (+63 / −0)
- `RaspPi/Raspberry Pi Setup/Instructions.docx` (binary)
- `RaspPi/Raspberry Pi Setup/watcher.py` (+196 / −0)
- `RaspPi/package-export.txt` (+26 / −0)
- `RaspPi/tts-test/main.py` (+4 / −0)
- `RaspPi/tts-test/modules/.gitignore` (+1 / −0)
- `RaspPi/tts-test/modules/bluetooth.py` (+59 / −0)
- `RaspPi/tts-test/modules/tts.py` (+47 / −0)
- `RaspPi/tts-test/requirements.txt` (binary)
- `frontend/src/app/components/DataCollector.tsx` (+559 / −403)
- `frontend/src/app/components/MotionLab.tsx` (+2 / −3)
- `frontend/src/app/context/SensorContext.tsx` (+96 / −35)
- `frontend/src/app/lib/captureFrames.ts` (+44 / −0)
- `frontend/src/app/lib/collectData.ts` (+159 / −0)
- `frontend/src/app/lib/collectStorage.ts` (+46 / −0)
- `frontend/src/app/lib/gloveSimulator.ts` (+35 / −0)
- `frontend/src/app/lib/recordings.ts` (+23 / −61)
- `frontend/src/app/pages/Collect.tsx` (+9 / −3)
- `frontend/src/app/pages/Profile.tsx` (+3 / −3)

### 2026-10-23 10:42 — Stuti Pandya · [`e4af3b9`](https://github.com/stupnd/Bridge/commit/e4af3b9e92974e3443120dcfbe5883115ff1d50f) · pushed by @stupnd

**Learn letter recognition from samples and add a Lab page**

- Replace hard-coded finger rules with a nearest-neighbour model trained
  on recorded samples (bundled asl-samples.csv); recognizes all 24 static letters
- Translate and Learn practice use the shared model, with confidence and hints
- New Lab page: virtual glove sliders, live glove input, prediction breakdown,
  editable training data (add sample, CSV import/export) and a robustness test
- Restructure the app into Translate, Learn, Glove, Collect and Lab pages

Files changed (29):
- `frontend/package-lock.json` (+0 / −18)
- `frontend/src/app/components/Calibration.tsx` (+73 / −0)
- `frontend/src/app/components/DataCollector.tsx` (+286 / −296)
- `frontend/src/app/components/FingerBars.tsx` (+30 / −0)
- `frontend/src/app/components/FlexSensor.tsx` (+0 / −601)
- `frontend/src/app/components/GloveStatus.tsx` (+33 / −0)
- `frontend/src/app/components/HandDiagram.tsx` (+99 / −0)
- `frontend/src/app/components/HandVisualizer.tsx` (+0 / −520)
- `frontend/src/app/components/Layout.tsx` (+59 / −71)
- `frontend/src/app/components/MotionLab.tsx` (+356 / −0)
- `frontend/src/app/components/common.tsx` (+120 / −0)
- `frontend/src/app/context/SensorContext.tsx` (+90 / −3)
- `frontend/src/app/data/asl-samples.csv` (+25 / −0)
- `frontend/src/app/lib/asl.ts` (+88 / −0)
- `frontend/src/app/lib/imu.ts` (+254 / −0)
- `frontend/src/app/lib/learnProgress.ts` (+63 / −0)
- `frontend/src/app/lib/recordings.ts` (+71 / −0)
- `frontend/src/app/lib/signModel.ts` (+233 / −0)
- `frontend/src/app/pages/Collect.tsx` (+11 / −9)
- `frontend/src/app/pages/Dashboard.tsx` (+0 / −231)
- `frontend/src/app/pages/Glove.tsx` (+147 / −0)
- `frontend/src/app/pages/Lab.tsx` (+441 / −0)
- `frontend/src/app/pages/Learn.tsx` (+370 / −113)
- `frontend/src/app/pages/Login.tsx` (+20 / −10)
- `frontend/src/app/pages/Profile.tsx` (+59 / −97)
- `frontend/src/app/pages/Sensor.tsx` (+0 / −19)
- `frontend/src/app/pages/Translate.tsx` (+111 / −0)
- `frontend/src/app/routes.tsx` (+11 / −8)
- `frontend/src/supabase.tsx` (+0 / −323)

### 2026-10-23 10:42 — Stuti Pandya · [`e624708`](https://github.com/stupnd/Bridge/commit/e6247083e5b8dd65f9410686a88247a81a95a65a) · pushed by @stupnd

**Stream 9-axis data from the glove and add IMU test tools**

- Main firmware sends flex + ICM-20948 readings in one 56-byte BLE packet at ~50 Hz
- Pinky moved to D2 (ADC1) to avoid ADC2 noise while BLE is on
- IMU auto-detects its I2C address and reconnects if it drops out
- Add a browser visualizer for the 9-axis test sketch
- Add a two-hand IMU sketch and an I2C wiring check sketch

Files changed (6):
- `ESP32/9-axis-test/9-axis-test.ino` (+35 / −12)
- `ESP32/9-axis-test/visualizer.html` (+438 / −0)
- `ESP32/esp32/esp32.ino` (+127 / −53)
- `ESP32/i2c-pincheck/i2c-pincheck.ino` (+59 / −0)
- `ESP32/two-hands/two-hands.html` (+662 / −0)
- `ESP32/two-hands/two-hands.ino` (+112 / −0)

### 2026-10-16 12:19 — Krisha · [`22ecfa1`](https://github.com/stupnd/Bridge/commit/22ecfa10630fc688049d97a78a5158f4d39c4f6e) · pushed by @KrishaVeera

**Collect page: frame-by-frame recording for all sign types, CSV export, IndexedDB autosave**

- SensorContext parses IMU + flex from every packet and exposes subscribe() for per-frame capture
- DataCollector drops Supabase; adds hand toggle, free-text label, Static/Moving/None types with editable window, countdown + progress, per-sample rate/IMU warnings, delete-last
- Long-format frames CSV (R_/L_ columns) plus per-session calibration CSV
- Autosave to IndexedDB with restore on load; dev-only glove simulator at 50 Hz

Files changed (7):
- `frontend/src/app/components/DataCollector.tsx` (+403 / −265)
- `frontend/src/app/context/SensorContext.tsx` (+121 / −13)
- `frontend/src/app/lib/captureFrames.ts` (+44 / −0)
- `frontend/src/app/lib/collectData.ts` (+159 / −0)
- `frontend/src/app/lib/collectStorage.ts` (+46 / −0)
- `frontend/src/app/lib/gloveSimulator.ts` (+35 / −0)
- `frontend/src/app/pages/Collect.tsx` (+2 / −1)

### 2026-10-09 08:54 — William · [`d84ee02`](https://github.com/stupnd/Bridge/commit/d84ee0265020c330b5830468b544bef4e64f7215) · pushed by @TheCakeOfTruth

**Merge pull request #7 from stupnd/rasppi-tts**

Set up the Raspberry Pi and text-to-speech

Files changed (9):
- `.gitignore` (+4 / −0)
- `RaspPi/Raspberry Pi Setup/Instructions.docx` (binary)
- `RaspPi/Raspberry Pi Setup/watcher.py` (+196 / −0)
- `RaspPi/package-export.txt` (+26 / −0)
- `RaspPi/tts-test/main.py` (+4 / −0)
- `RaspPi/tts-test/modules/.gitignore` (+1 / −0)
- `RaspPi/tts-test/modules/bluetooth.py` (+59 / −0)
- `RaspPi/tts-test/modules/tts.py` (+47 / −0)
- `RaspPi/tts-test/requirements.txt` (binary)

### 2026-10-02 10:56 — Cake · [`4b4192e`](https://github.com/stupnd/Bridge/commit/4b4192ebdf5ede649767f6694432077e8757d12d) · pushed by @TheCakeOfTruth

**Began work on bluetooth connection**

Files changed (8):
- `RaspPi/Raspberry Pi Setup/Instructions.docx` (binary)
- `RaspPi/Raspberry Pi Setup/watcher.py` (+20 / −14)
- `RaspPi/package-export.txt` (+11 / −1)
- `RaspPi/tts-test/main.py` (+3 / −37)
- `RaspPi/tts-test/modules/.gitignore` (+1 / −0)
- `RaspPi/tts-test/modules/bluetooth.py` (+59 / −0)
- `RaspPi/tts-test/modules/tts.py` (+47 / −0)
- `RaspPi/tts-test/requirements.txt` (binary)

### 2026-09-26 23:39 — Cake · [`646a75f`](https://github.com/stupnd/Bridge/commit/646a75fef230bc63dc46598c850082e7310629c4) · pushed by @TheCakeOfTruth

**Set up the Raspberry Pi, added a test script for text-to-speech**

See setup instructions and package-export for usage instructions.

Files changed (6):
- `.gitignore` (+4 / −0)
- `RaspPi/Raspberry Pi Setup/Instructions.docx` (binary)
- `RaspPi/Raspberry Pi Setup/watcher.py` (+190 / −0)
- `RaspPi/package-export.txt` (+16 / −0)
- `RaspPi/tts-test/main.py` (+38 / −0)
- `RaspPi/tts-test/requirements.txt` (binary)

### 2026-09-25 10:33 — Krisha Veera · [`5282362`](https://github.com/stupnd/Bridge/commit/5282362861425bdef0e9927c42f651e42f9c8b8f) · pushed by @KrishaVeera

**Add ML data-collection page with Supabase sync and CSV export**

Files changed (4):
- `frontend/src/app/components/DataCollector.tsx` (+481 / −0)
- `frontend/src/app/components/Layout.tsx` (+2 / −1)
- `frontend/src/app/pages/Collect.tsx` (+16 / −0)
- `frontend/src/app/routes.tsx` (+2 / −0)

### 2026-09-18 09:26 — Stuti Pandya · [`23d4aca`](https://github.com/stupnd/Bridge/commit/23d4acab5e30209c1af6a5c107d80ef02c1137d5) · pushed by @stupnd

**Improve 9-axis test sketch with I2C scan and column output**

Scans the I2C bus on boot to surface wiring problems, tries both
ICM-20948 addresses (AD0=0/1), and prints one tab-aligned row per
sample instead of four lines.

Files changed (1):
- `ESP32/9-axis-test/9-axis-test.ino` (+55 / −26)

### 2026-09-18 09:24 — Stuti Pandya · [`0f7e17d`](https://github.com/stupnd/Bridge/commit/0f7e17d917cd773ab2e712547d03717a077cdfa3) · pushed by @stupnd

**Add GitHub Action that logs every commit to COMMIT_LOG.md**

Runs on push to main and records author, date, message, and files
changed for each commit, newest first. Seeded with existing history.

Files changed (3):
- `.github/scripts/commit-log.sh` (+67 / −0)
- `.github/workflows/commit-log.yml` (+43 / −0)
- `COMMIT_LOG.md` (+496 / −0)

### 2026-04-13 13:21 — Stuti Pandya · [`f7f2d92`](https://github.com/stupnd/Bridge/commit/f7f2d926bbb0d82c858cbd6e2396de8acd2579bb)

**Refactor to use finger sensors and remove IMU code**

Removed ICM-20948 sensor initialization and related code. Added analog readings for finger sensors instead.

Files changed (1):
- `ESP32/esp32/esp32.ino` (+51 / −63)

### 2026-04-07 16:56 — Stuti Pandya · [`671bb7e`](https://github.com/stupnd/Bridge/commit/671bb7eb3cde102d3810abae31fb09c32bf6e0db)

**Refactor sensor integration and enhance user authentication**

- Updated supabaseClient to use hardcoded Supabase URL and key for testing.
- Introduced ProtectedRoute component to manage user authentication and access control.
- Integrated SensorContext for managing sensor state and connectivity across components.
- Enhanced FlexSensor and HandVisualizer components to utilize context for sensor data.
- Updated Dashboard and Login components to support user authentication with Supabase.
- Improved gesture recognition logic and calibration handling in the Dashboard component.

Files changed (9):
- `frontend/src/app/components/FlexSensor.tsx` (+48 / −81)
- `frontend/src/app/components/HandVisualizer.tsx` (+2 / −45)
- `frontend/src/app/components/ProtectedRoute.tsx` (+19 / −0)
- `frontend/src/app/context/SensorContext.tsx` (+81 / −0)
- `frontend/src/app/pages/Dashboard.tsx` (+193 / −89)
- `frontend/src/app/pages/Login.tsx` (+44 / −23)
- `frontend/src/app/pages/Profile.tsx` (+3 / −1)
- `frontend/src/app/routes.tsx` (+9 / −1)
- `frontend/src/supabaseClient.ts` (+3 / −3)

### 2026-04-01 22:53 — Stuti Pandya · [`9429559`](https://github.com/stupnd/Bridge/commit/9429559c2d7266c813368deda137446327d823a4)

**Update package dependencies and enhance FlexSensor calibration features**

- Added new dependencies for Supabase and TypeScript types in package.json.
- Updated package-lock.json to reflect changes in dependencies.
- Enhanced FlexSensor component with improved calibration functionality, including saving and loading calibration data, and user feedback for calibration steps.
- Introduced a new HandVisualizer route for better integration with the calibration process.

Files changed (6):
- `frontend/package-lock.json` (+75 / −11)
- `frontend/package.json` (+8 / −12)
- `frontend/src/app/components/FlexSensor.tsx` (+138 / −22)
- `frontend/src/app/components/HandVisualizer.tsx` (+563 / −0)
- `frontend/src/app/lib/flexCalibrationStorage.ts` (+67 / −0)
- `frontend/src/app/routes.tsx` (+2 / −0)

### 2026-04-01 10:15 — Stuti Pandya · [`5c46392`](https://github.com/stupnd/Bridge/commit/5c46392182cabc9e347e1c8342d6bd13653e4b0a)

**Merge pull request #6 from stupnd/feature/sensor-calibration**

Feature/sensor calibration

Files changed (53):
- `.agents/skills/supabase-postgres-best-practices/AGENTS.md` (+68 / −0)
- `.agents/skills/supabase-postgres-best-practices/CLAUDE.md` (+68 / −0)
- `.agents/skills/supabase-postgres-best-practices/README.md` (+116 / −0)
- `.agents/skills/supabase-postgres-best-practices/SKILL.md` (+64 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/_contributing.md` (+171 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/_sections.md` (+39 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/_template.md` (+34 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/advanced-full-text-search.md` (+55 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/advanced-jsonb-indexing.md` (+49 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/conn-idle-timeout.md` (+46 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/conn-limits.md` (+44 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/conn-pooling.md` (+41 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/conn-prepared-statements.md` (+46 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/data-batch-inserts.md` (+54 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/data-n-plus-one.md` (+53 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/data-pagination.md` (+50 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/data-upsert.md` (+50 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/lock-advisory.md` (+56 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/lock-deadlock-prevention.md` (+68 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/lock-short-transactions.md` (+50 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/lock-skip-locked.md` (+54 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-explain-analyze.md` (+45 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-pg-stat-statements.md` (+55 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-vacuum-analyze.md` (+55 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/query-composite-indexes.md` (+44 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/query-covering-indexes.md` (+40 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/query-index-types.md` (+48 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/query-missing-indexes.md` (+43 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/query-partial-indexes.md` (+45 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-constraints.md` (+80 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-data-types.md` (+46 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-foreign-key-indexes.md` (+59 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-lowercase-identifiers.md` (+55 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-partitioning.md` (+55 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-primary-keys.md` (+61 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/security-privileges.md` (+54 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/security-rls-basics.md` (+50 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/security-rls-performance.md` (+57 / −0)
- `.gitignore` (+1 / −0)
- `frontend/dist/assets/index-B4Zaqk_m.js` (+132 / −0)
- `frontend/dist/assets/index-LzwFKSW3.css` (+1 / −0)
- `frontend/dist/index.html` (+16 / −0)
- `frontend/package-lock.json` (+180 / −4)
- `frontend/package.json` (+7 / −1)
- `frontend/src/app/components/FlexSensor.tsx` (+464 / −42)
- `frontend/src/app/components/Layout.tsx` (+0 / −1)
- `frontend/src/app/pages/Sensor.tsx` (+1 / −0)
- `frontend/src/supabase.tsx` (+323 / −0)
- `frontend/src/supabaseClient.ts` (+10 / −0)
- `frontend/src/vite-env.d.ts` (+10 / −0)
- `package-lock.json` (+158 / −0)
- `package.json` (+5 / −0)
- `skills-lock.json` (+10 / −0)

### 2026-03-27 11:16 — Stuti Pandya · [`4c1a818`](https://github.com/stupnd/Bridge/commit/4c1a818854ae5e57b5500e62b631f40a9ce85e1b)

**Add .env to .gitignore and update package dependencies**

- Added .env to .gitignore to prevent sensitive information from being tracked.
- Updated frontend package-lock.json and package.json to include new dependencies for Supabase and TypeScript types.
- Enhanced FlexSensor component with gesture recognition and calibration features, including loading profiles from Supabase.
- Introduced new utility functions for gesture classification and sample collection.

Files changed (52):
- `.agents/skills/supabase-postgres-best-practices/AGENTS.md` (+68 / −0)
- `.agents/skills/supabase-postgres-best-practices/CLAUDE.md` (+68 / −0)
- `.agents/skills/supabase-postgres-best-practices/README.md` (+116 / −0)
- `.agents/skills/supabase-postgres-best-practices/SKILL.md` (+64 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/_contributing.md` (+171 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/_sections.md` (+39 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/_template.md` (+34 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/advanced-full-text-search.md` (+55 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/advanced-jsonb-indexing.md` (+49 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/conn-idle-timeout.md` (+46 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/conn-limits.md` (+44 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/conn-pooling.md` (+41 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/conn-prepared-statements.md` (+46 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/data-batch-inserts.md` (+54 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/data-n-plus-one.md` (+53 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/data-pagination.md` (+50 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/data-upsert.md` (+50 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/lock-advisory.md` (+56 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/lock-deadlock-prevention.md` (+68 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/lock-short-transactions.md` (+50 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/lock-skip-locked.md` (+54 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-explain-analyze.md` (+45 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-pg-stat-statements.md` (+55 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/monitor-vacuum-analyze.md` (+55 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/query-composite-indexes.md` (+44 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/query-covering-indexes.md` (+40 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/query-index-types.md` (+48 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/query-missing-indexes.md` (+43 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/query-partial-indexes.md` (+45 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-constraints.md` (+80 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-data-types.md` (+46 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-foreign-key-indexes.md` (+59 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-lowercase-identifiers.md` (+55 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-partitioning.md` (+55 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/schema-primary-keys.md` (+61 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/security-privileges.md` (+54 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/security-rls-basics.md` (+50 / −0)
- `.agents/skills/supabase-postgres-best-practices/references/security-rls-performance.md` (+57 / −0)
- `.gitignore` (+1 / −0)
- `frontend/dist/assets/index-B4Zaqk_m.js` (+132 / −0)
- `frontend/dist/assets/index-LzwFKSW3.css` (+1 / −0)
- `frontend/dist/index.html` (+16 / −0)
- `frontend/package-lock.json` (+180 / −4)
- `frontend/package.json` (+7 / −1)
- `frontend/src/app/components/FlexSensor.tsx` (+388 / −80)
- `frontend/src/app/components/Layout.tsx` (+0 / −1)
- `frontend/src/supabase.tsx` (+323 / −0)
- `frontend/src/supabaseClient.ts` (+10 / −0)
- `frontend/src/vite-env.d.ts` (+10 / −0)
- `package-lock.json` (+158 / −0)
- `package.json` (+5 / −0)
- `skills-lock.json` (+10 / −0)

### 2026-03-26 14:12 — Stuti Pandya · [`7b744c8`](https://github.com/stupnd/Bridge/commit/7b744c8fc28454020ee70dcd9ad24dd17657e5d5)

**Add flex sensor BLE integration and calibration UI**

Files changed (2):
- `frontend/src/app/components/FlexSensor.tsx` (+154 / −40)
- `frontend/src/app/pages/Sensor.tsx` (+1 / −0)

### 2026-03-20 10:16 — William · [`60cc0f2`](https://github.com/stupnd/Bridge/commit/60cc0f210388a10a5470cace023d6bb3d2197af0)

**Merge pull request #5 from stupnd/feature/9axis-sensor-integration**

Merged from Feature/9axis sensor integration
Adds code for transmitting all 9-axis sensor data and a test flex sensor from the ESP32, updated the python test script accordingly.

Files changed (5):
- `ESP32/9-axis-test/9-axis-test.ino` (+49 / −0)
- `ESP32/esp32/esp32.ino` (+63 / −6)
- `ESP32/esp32/flex.ino` (+0 / −30)
- `ESP32/old/flex.ino` (+30 / −0)
- `ESP32/test_script.py` (+7 / −2)

### 2026-03-18 16:37 — Cake · [`646b943`](https://github.com/stupnd/Bridge/commit/646b943c739010b58b5d022ffbadb9b50a9b9129)

**Update ESP32 code to transmit sensor data**

Also updated test_script.py to read the data

Files changed (4):
- `ESP32/esp32/esp32.ino` (+63 / −6)
- `ESP32/esp32/flex.ino` (+0 / −30)
- `ESP32/old/flex.ino` (+30 / −0)
- `ESP32/test_script.py` (+7 / −2)

### 2026-03-13 11:10 — Cake · [`8009efc`](https://github.com/stupnd/Bridge/commit/8009efcacd17786bb1619b871c6ac89310217f82)

**Uploaded working code for the 9-axis sensor**

It prints the numbers.

Files changed (1):
- `ESP32/9-axis-test/9-axis-test.ino` (+49 / −0)

### 2026-02-26 21:27 — Stuti Pandya · [`58196a9`](https://github.com/stupnd/Bridge/commit/58196a9e8900c61c624daba7fd46753eca1ebeb8)

**Add BLE functionality for FlexSensor in ESP32 project**

- Created a new flex.ino file to implement Bluetooth Low Energy (BLE) service for the FlexSensor.
- Set up BLE characteristics to read and notify flex sensor values.
- Integrated analog reading of flex values and established BLE advertising for connectivity.

Files changed (1):
- `ESP32/esp32/flex.ino` (+30 / −0)

### 2026-02-26 20:35 — Stuti Pandya · [`c01b56d`](https://github.com/stupnd/Bridge/commit/c01b56d93a909a2c32723097c80ca48489e23c33)

**Add Sensor page and FlexSensor component for ESP32 glove connectivity**

- Introduced a new Sensor page to the routing structure.
- Added FlexSensor component to handle Bluetooth connectivity and display flex values.
- Updated Layout component to include navigation for the new Sensor page.

Files changed (4):
- `frontend/src/app/components/FlexSensor.tsx` (+96 / −0)
- `frontend/src/app/components/Layout.tsx` (+1 / −0)
- `frontend/src/app/pages/Sensor.tsx` (+18 / −0)
- `frontend/src/app/routes.tsx` (+2 / −0)

### 2026-02-24 20:39 — William · [`ae916b2`](https://github.com/stupnd/Bridge/commit/ae916b29135f49cd54ec9d23f07ae01026678bc3)

**Merge pull request #4 from stupnd/william**

Created ESP32 sample program

Files changed (2):
- `ESP32/esp32/esp32.ino` (+48 / −0)
- `ESP32/test_script.py` (+52 / −0)

### 2026-02-24 20:39 — Cake · [`53a0d0a`](https://github.com/stupnd/Bridge/commit/53a0d0abd7da425ab6ed8d25e3d82c60956918dd)

**Updated ESP32 sample program**

Files changed (2):
- `ESP32/esp32/esp32.ino` (+13 / −5)
- `ESP32/test_script.py` (+40 / −6)

### 2026-02-24 18:26 — Cake · [`e7e1097`](https://github.com/stupnd/Bridge/commit/e7e10977dd913266dd57b99133e072bfce176bba)

**Create test script for BLE communication between ESP32 and Laptop**

Files changed (2):
- `ESP32/esp32/esp32.ino` (+40 / −0)
- `ESP32/test_script.py` (+18 / −0)

### 2026-02-13 10:04 — Gauthier-Balemba · [`84a764e`](https://github.com/stupnd/Bridge/commit/84a764e6471fa95f02e793ccbbf05eb4ef80a326)

**Add files via upload**

Files changed (1):
- `RaspPi/raspberry-pi-4-datasheet.pdf` (binary)

### 2026-02-13 10:01 — Gauthier-Balemba · [`6d2fabf`](https://github.com/stupnd/Bridge/commit/6d2fabf1f712bdba80431685f519396c5d3cf4ce)

**Add files via upload**

Files changed (1):
- `ESP32/esp32_datasheet_en.pdf` (binary)

### 2026-02-13 09:57 — Gauthier-Balemba · [`89df8b2`](https://github.com/stupnd/Bridge/commit/89df8b2f788a640a64074e6fcbaa77b7ec768f2f)

**Add files via upload**

Files changed (1):
- `ESP32/ICM-20948-9 Axis sensor-Technical sheet.pdf` (binary)

### 2026-02-06 09:45 — Stuti Pandya · [`85ef533`](https://github.com/stupnd/Bridge/commit/85ef5332a4701d9c59d5ee726e321705b2550cc5)

**Initialize frontend project for Sign Language Translation App UI. Added essential files including package.json, package-lock.json, and index.html. Implemented routing structure with components for Login, Dashboard, Learn, and Profile. Included layout and navigation components for user interface. Added guidelines for project development.**

Files changed (87):
- `.DS_Store` (binary)
- `.gitignore` (+1 / −0)
- `GUI/.gitignore` (+0 / −28)
- `GUI/README.md` (+0 / −151)
- `GUI/package-lock.json` (+0 / −17463)
- `GUI/package.json` (+0 / −34)
- `GUI/public/index.html` (+0 / −14)
- `GUI/src/App.css` (+0 / −53)
- `GUI/src/App.js` (+0 / −59)
- `GUI/src/components/SensorDisplay.css` (+0 / −86)
- `GUI/src/components/SensorDisplay.js` (+0 / −44)
- `GUI/src/components/SensorGraph.css` (+0 / −65)
- `GUI/src/components/SensorGraph.js` (+0 / −80)
- `GUI/src/index.css` (+0 / −14)
- `GUI/src/index.js` (+0 / −11)
- `frontend/.gitignore` (+28 / −0)
- `frontend/ATTRIBUTIONS.md` (+3 / −0)
- `frontend/README.md` (+11 / −0)
- `frontend/guidelines/Guidelines.md` (+61 / −0)
- `frontend/index.html` (+15 / −0)
- `frontend/package-lock.json` (+5511 / −0)
- `frontend/package.json` (+89 / −0)
- `frontend/postcss.config.mjs` (+15 / −0)
- `frontend/src/app/App.tsx` (+6 / −0)
- `frontend/src/app/components/Layout.tsx` (+85 / −0)
- `frontend/src/app/components/figma/ImageWithFallback.tsx` (+27 / −0)
- `frontend/src/app/components/ui/accordion.tsx` (+66 / −0)
- `frontend/src/app/components/ui/alert-dialog.tsx` (+157 / −0)
- `frontend/src/app/components/ui/alert.tsx` (+66 / −0)
- `frontend/src/app/components/ui/aspect-ratio.tsx` (+11 / −0)
- `frontend/src/app/components/ui/avatar.tsx` (+53 / −0)
- `frontend/src/app/components/ui/badge.tsx` (+46 / −0)
- `frontend/src/app/components/ui/breadcrumb.tsx` (+109 / −0)
- `frontend/src/app/components/ui/button.tsx` (+58 / −0)
- `frontend/src/app/components/ui/calendar.tsx` (+75 / −0)
- `frontend/src/app/components/ui/card.tsx` (+92 / −0)
- `frontend/src/app/components/ui/carousel.tsx` (+241 / −0)
- `frontend/src/app/components/ui/chart.tsx` (+353 / −0)
- `frontend/src/app/components/ui/checkbox.tsx` (+32 / −0)
- `frontend/src/app/components/ui/collapsible.tsx` (+33 / −0)
- `frontend/src/app/components/ui/command.tsx` (+177 / −0)
- `frontend/src/app/components/ui/context-menu.tsx` (+252 / −0)
- `frontend/src/app/components/ui/dialog.tsx` (+135 / −0)
- `frontend/src/app/components/ui/drawer.tsx` (+132 / −0)
- `frontend/src/app/components/ui/dropdown-menu.tsx` (+257 / −0)
- `frontend/src/app/components/ui/form.tsx` (+168 / −0)
- `frontend/src/app/components/ui/hover-card.tsx` (+44 / −0)
- `frontend/src/app/components/ui/input-otp.tsx` (+77 / −0)
- `frontend/src/app/components/ui/input.tsx` (+21 / −0)
- `frontend/src/app/components/ui/label.tsx` (+24 / −0)
- `frontend/src/app/components/ui/menubar.tsx` (+276 / −0)
- `frontend/src/app/components/ui/navigation-menu.tsx` (+168 / −0)
- `frontend/src/app/components/ui/pagination.tsx` (+127 / −0)
- `frontend/src/app/components/ui/popover.tsx` (+48 / −0)
- `frontend/src/app/components/ui/progress.tsx` (+31 / −0)
- `frontend/src/app/components/ui/radio-group.tsx` (+45 / −0)
- `frontend/src/app/components/ui/resizable.tsx` (+56 / −0)
- `frontend/src/app/components/ui/scroll-area.tsx` (+58 / −0)
- `frontend/src/app/components/ui/select.tsx` (+189 / −0)
- `frontend/src/app/components/ui/separator.tsx` (+28 / −0)
- `frontend/src/app/components/ui/sheet.tsx` (+139 / −0)
- `frontend/src/app/components/ui/sidebar.tsx` (+726 / −0)
- `frontend/src/app/components/ui/skeleton.tsx` (+13 / −0)
- `frontend/src/app/components/ui/slider.tsx` (+63 / −0)
- `frontend/src/app/components/ui/sonner.tsx` (+25 / −0)
- `frontend/src/app/components/ui/switch.tsx` (+31 / −0)
- `frontend/src/app/components/ui/table.tsx` (+116 / −0)
- `frontend/src/app/components/ui/tabs.tsx` (+66 / −0)
- `frontend/src/app/components/ui/textarea.tsx` (+18 / −0)
- `frontend/src/app/components/ui/toggle-group.tsx` (+73 / −0)
- `frontend/src/app/components/ui/toggle.tsx` (+47 / −0)
- `frontend/src/app/components/ui/tooltip.tsx` (+61 / −0)
- `frontend/src/app/components/ui/use-mobile.ts` (+21 / −0)
- `frontend/src/app/components/ui/utils.ts` (+6 / −0)
- `frontend/src/app/pages/Dashboard.tsx` (+127 / −0)
- `frontend/src/app/pages/Learn.tsx` (+140 / −0)
- `frontend/src/app/pages/Login.tsx` (+83 / −0)
- `frontend/src/app/pages/Profile.tsx` (+115 / −0)
- `frontend/src/app/routes.tsx` (+22 / −0)
- `frontend/src/main.tsx` (+7 / −0)
- `frontend/src/styles/fonts.css` (+0 / −0)
- `frontend/src/styles/index.css` (+3 / −0)
- `frontend/src/styles/tailwind.css` (+4 / −0)
- `frontend/src/styles/theme.css` (+181 / −0)
- `frontend/tsconfig.json` (+31 / −0)
- `frontend/tsconfig.node.json` (+11 / −0)
- `frontend/vite.config.ts` (+22 / −0)

### 2026-02-04 13:51 — Stuti Pandya · [`40c15a0`](https://github.com/stupnd/Bridge/commit/40c15a01e134201961495fdf042a00b797927a3d)

**Merge pull request #3 from stupnd/william**

William

Files changed (2):
- `ESP32/README.md` (+1 / −0)
- `RaspPi/README.md` (+2 / −0)

### 2026-02-04 13:50 — Stuti Pandya · [`5b0fb74`](https://github.com/stupnd/Bridge/commit/5b0fb74ec8d632edd3036f712b667fca660894d8)

**Merge pull request #2 from stupnd/main**

Merge pull request #1 from stupnd/william

Files changed (0):
- _(none)_

### 2026-02-04 13:49 — Cake · [`d89f87a`](https://github.com/stupnd/Bridge/commit/d89f87a2eaa7353243693db33628b00e55c1824a)

**Added new folders**

Files changed (2):
- `ESP32/README.md` (+1 / −0)
- `RaspPi/README.md` (+2 / −0)

### 2026-02-04 13:47 — Stuti Pandya · [`4e11c73`](https://github.com/stupnd/Bridge/commit/4e11c738b59cc8d90c4a3cc67659c1096cb40f84)

**Merge pull request #1 from stupnd/william**

Organized into folders

Files changed (26):
- `.gitignore` (+0 / −28)
- `GUI/.gitignore` (+28 / −0)
- `GUI/README.md` (+151 / −0)
- `GUI/package-lock.json` (+17463 / −0)
- `GUI/package.json` (+34 / −0)
- `GUI/public/index.html` (+14 / −0)
- `GUI/src/App.css` (+53 / −0)
- `GUI/src/App.js` (+59 / −0)
- `GUI/src/components/SensorDisplay.css` (+86 / −0)
- `GUI/src/components/SensorDisplay.js` (+44 / −0)
- `GUI/src/components/SensorGraph.css` (+65 / −0)
- `GUI/src/components/SensorGraph.js` (+80 / −0)
- `GUI/src/index.css` (+14 / −0)
- `GUI/src/index.js` (+11 / −0)
- `README.md` (+0 / −151)
- `package-lock.json` (+0 / −17463)
- `package.json` (+0 / −34)
- `public/index.html` (+0 / −14)
- `src/App.css` (+0 / −53)
- `src/App.js` (+0 / −59)
- `src/components/SensorDisplay.css` (+0 / −86)
- `src/components/SensorDisplay.js` (+0 / −44)
- `src/components/SensorGraph.css` (+0 / −65)
- `src/components/SensorGraph.js` (+0 / −80)
- `src/index.css` (+0 / −14)
- `src/index.js` (+0 / −11)

### 2026-02-04 13:45 — Cake · [`3f9e66b`](https://github.com/stupnd/Bridge/commit/3f9e66bab846e7b9e9b086fbc56921f19bd40847)

**Organized into folders**

Files changed (26):
- `.gitignore` (+0 / −28)
- `GUI/.gitignore` (+28 / −0)
- `GUI/README.md` (+151 / −0)
- `GUI/package-lock.json` (+17463 / −0)
- `GUI/package.json` (+34 / −0)
- `GUI/public/index.html` (+14 / −0)
- `GUI/src/App.css` (+53 / −0)
- `GUI/src/App.js` (+59 / −0)
- `GUI/src/components/SensorDisplay.css` (+86 / −0)
- `GUI/src/components/SensorDisplay.js` (+44 / −0)
- `GUI/src/components/SensorGraph.css` (+65 / −0)
- `GUI/src/components/SensorGraph.js` (+80 / −0)
- `GUI/src/index.css` (+14 / −0)
- `GUI/src/index.js` (+11 / −0)
- `README.md` (+0 / −151)
- `package-lock.json` (+0 / −17463)
- `package.json` (+0 / −34)
- `public/index.html` (+0 / −14)
- `src/App.css` (+0 / −53)
- `src/App.js` (+0 / −59)
- `src/components/SensorDisplay.css` (+0 / −86)
- `src/components/SensorDisplay.js` (+0 / −44)
- `src/components/SensorGraph.css` (+0 / −65)
- `src/components/SensorGraph.js` (+0 / −80)
- `src/index.css` (+0 / −14)
- `src/index.js` (+0 / −11)

### 2026-02-04 13:40 — Stuti Pandya · [`470329a`](https://github.com/stupnd/Bridge/commit/470329ad02a445f6436037692f53b36a13dbfb12)

**Initialize ASL Glove Sensor Dashboard project with essential files. Added .gitignore, package.json, and package-lock.json for dependency management. Created main application structure including App.js, components for sensor display and graph, and basic styling. Included README for project overview and setup instructions.**

Files changed (13):
- `.gitignore` (+28 / −0)
- `README.md` (+151 / −0)
- `package-lock.json` (+17463 / −0)
- `package.json` (+34 / −0)
- `public/index.html` (+14 / −0)
- `src/App.css` (+53 / −0)
- `src/App.js` (+59 / −0)
- `src/components/SensorDisplay.css` (+86 / −0)
- `src/components/SensorDisplay.js` (+44 / −0)
- `src/components/SensorGraph.css` (+65 / −0)
- `src/components/SensorGraph.js` (+80 / −0)
- `src/index.css` (+14 / −0)
- `src/index.js` (+11 / −0)
