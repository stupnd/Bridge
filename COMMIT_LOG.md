# Commit Log

Automatically updated by the `commit-log` GitHub Action on every push to `main`. Newest first.

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
