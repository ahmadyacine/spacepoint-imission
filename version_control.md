# SpacePoint Mission Portal - Version Control

This document tracks all version releases, features, updates, and bug fixes for the SpacePoint Mission Portal educational platform.

---

## [1.6.0] - 2026-07-06

### Fixed
- **iPad/Safari Compatibility (3 bugs resolved)**:
  - Email case normalization on login to prevent case-sensitivity authentication failures on Safari.
  - Invitation code `max_uses` field now correctly handles unlimited (`null`) codes without crashing.
  - Components page crash handling: added safe fallback when component data is malformed or missing.
- **Dashboard/Leaderboard Network Resilience**:
  - Auto-retry mechanism added to dashboard and leaderboard fetch calls on transient `ERR_NO_BUFFER_SPACE` network errors, preventing blank dashboards on low-memory devices.

---

## [1.5.0] - 2026-07-05

### Added
- **Future Space Engineers Summer Camp Checklist**:
  - New dedicated `checklist.html` page for tracking Summer Camp activity completion.
  - Students can view and interact with their camp activity progress checklist.
  - Home page (`home.html`) updated with a Summer Camp entry point card.
  - New backend model (`checklist.py`) and full REST API routes (`/api/checklist`) for checklist state persistence.
- **Admin Camp Monitoring Panel**:
  - Admin panel (`admin.html`) extended with a Summer Camp monitoring section showing per-student checklist completion status across the batch.
- **Component Data Size Display**:
  - Components cards now display the data size of each component, giving students better visibility into memory/data footprint.
- **Component Category Rename — MPKit & SatKit**:
  - Renamed the `Physical` category to `MPKit` across the backend model and admin panel.
  - Student-facing component filter (`components.html`) updated: replaced `Physical` tag with `MPKit` and added the new `SatKit` filter tag.

---

## [1.4.0] - 2026-06-25

### Added
- **Ground Station Dashboard Integration** (merged from `LoRa-Dashboard-V3-main`):
  - Full LoRa Ground Station telemetry dashboard integrated into the Mission Portal repo and served at `/ground-station`.
  - Real-time satellite telemetry via Web Serial API (USB) and Socket.IO (Wi-Fi bridge).
  - 3D Earth visualization with live satellite orbit path rendering.
  - ADCS attitude visualization (pitch, roll, yaw) with animated satellite model.
  - Live sensor charts (temperature, voltage, current, altitude, RSSI) with historical replay.
  - Export to PDF mission report feature.
  - Exhibition mode for hands-free kiosk display (`exhibition_mode.md`).
  - Arduino firmware source included for Ground Station board, Satellite board, and ADCS module.
  - FastAPI backend updated to proxy Ground Station routes and integrate with page access control.
- **SpacePoint Software Guide Integration** (merged from `spacepoint-software-guide-main`):
  - Interactive software engineering guide integrated into the Mission Portal repo.
  - Covers ADCS, CDHS, Communication (school & university level), and introductory overviews.
  - Includes practice activities and guided coding exercises.
- **Auto-Login via `sp_token`**:
  - Ground Station and portal pages auto-authenticate using `sp_token` from `localStorage`, removing the need for repeated logins during a session.
- **Home Hub Page**:
  - New `home.html` hub landing page linking to the Mission Portal, Ground Station, and Software Guide from a single entry point.

### Fixed
- **Ground Station — Web Serial UI Metric Rendering**: Corrected metric field mapping in the Web Serial parsing pipeline so all sensor values render correctly in the UI.
- **Ground Station — Chart Data Type**: Fixed crash caused by non-numeric values being passed to `.toFixed()`; chart data is now stored as numeric values.
- **Ground Station — `resetExpandedZoom` Always Available**: Fixed `resetExpandedZoom` function not being accessible when chart zoom controls were rendered.
- **Ground Station — Socket.IO Nginx Proxy**: Changed Socket.IO connection to use `window.location.origin` so it routes correctly through the Nginx reverse proxy.
- **Ground Station — Header Layout & ESP32 Decimal Precision**: Fixed header layout overflow and increased decimal precision for power/current readings to display tiny ESP32 sensor values (e.g., `0.001 mA`).
- **FastAPI — Removed Legacy Static Routes**: Cleaned up outdated static file routes from FastAPI that conflicted with the Nginx-served frontend.

---

## [1.3.0] - 2026-06-04

### Added
- **Comprehensive Mission Budget Dashboards**:
  - Full dashboard page (`dashboard.html`) with detailed mission report cards, budget charts, and pass/fail status for all budget phases.
  - Backend routing (`/api/missions`) for Power, Mass, Cost, and Data budget analysis and aggregation.
- **Gamification Drawer Script**:
  - `gamification_drawer.js` extracted as a shared script, injected across all student-facing planning pages to deliver the collapsible standings drawer and badge display consistently.
- **Updated Branding**: New SpacePoint logo (`logo.png`, `SpacePoint logo2.png`) rolled out across the platform.

---

## [1.2.0] - 2026-05-24

### Added
- **Gamification, Leaderboard & Stamps System**:
  - Classmate leaderboard to foster friendly competition among students sharing the same invitation code (batch).
  - Dynamic student standing rankings showing trophies (🥇, 🥈, 🥉) for the top three, classmate progress tracking, and current student highlight.
  - Real-time Points indicator (`🏆 <points> XP`) shown globally in the navigation header of all student-facing pages.
  - **Collapsible Standings Drawer**: Added a slide-out drawer on the left side of all student-facing planning pages. Students can open/close it at any time to view their badges/stamps checklist and their real-time batch leaderboard standing.
  - **Dynamic Completion congrats Modal**: Added an overlay popup that triggers when the student successfully finishes a design step and clicks next. It dynamically displays the unlocked badge icon and name, the XP points awarded, and details of any active speed release bonuses.
  - Satellite engineering stamps checklist card on the dashboard showing completed stages in vibrant colors and locked stages in grayscale.
  - Speed-based release bonus: completing a section within 24 hours of release awards `+100 XP` bonus (Total `200 XP`), decaying by `20 XP` per day down to a base of `100 XP` on Day 6+.
  - Fully dynamic calculations based on existing DB tables (no migrations or schema changes needed).

---

## [1.1.0] - 2026-05-24

### Added
- **Bulk Component Excel Import**:
  - Direct import of components from Excel spreadsheet.
  - Interactive **Import Preview Modal** that parses Excel data client-side (using SheetJS) to show valid and invalid records before committing to the database.
  - Flexible header mappings to dynamically resolve column orders and variations.
  - Support for bulk creation backend API endpoint (`POST /api/components/bulk`).
- **Downloadable Excel Template**:
  - `📥 Template` button to download `SpacePoint_Component_Template.xlsx` pre-filled with correct database headers and sample records.
- **Local Device Image Uploads**:
  - `📁 Upload Image` button in the Add/Edit Component modal to select local image files.
  - Image files are uploaded to backend (`POST /api/components/upload-image`), stored in `frontend/uploads/`, and assigned unique UUID filenames.
  - Auto-populates URL and renders a visual preview thumbnail inside the modal form.

### Fixed
- **Image URL Browser Validation Issue**:
  - Changed the Image URL input `type` from `url` to `text` to prevent HTML5 browser validation errors when saving relative image paths (like `/static/uploads/image.png`).
- **Decimal Precision Form Step Validation**:
  - Updated the `step` attribute from `0.1` and `0.01` to `"any"` for the **Mass (g)**, **Voltage (V)**, **Current (mA)**, and **Cost (USD)** inputs to support arbitrary decimal values (e.g., `0.01` mA) without triggering step validation errors.

---

## [1.0.0] - 2026-05-24

### Added
- **Core Satellite Planning Journey**:
  - **Phase 1 (Auth & Profile)**: Student and Admin authentication, school and grade info.
  - **Phase 2 (Create Mission)**: Mad Libs objectives and Orbit parameter definitions.
  - **Phase 3 (Component Selection)**: Categorized library of satellite parts (ADCS, CDHS, EPS, etc.) with custom parameters.
  - **Phase 4 (CONOPS)**: Orbit mode scheduling and active/inactive components matrix.
  - **Phase 5 (Data Budget)**: Real-time telemetry accumulation computations and storage validation.
  - **Phase 6 (Power Budget)**: Solar cell quantity calculations and power budget validation.
  - **Phase 7 (Link Budget)**: RF signal calculations and Link Margin checks.
  - **Phase 8 (Mass Budget)**: Satellite mass and physical layout volume compliance.
  - **Phase 9 (Cost Budget)**: Budget cap validation.
  - **Phase 10 (Mission Dashboard)**: Detailed report cards, charts, and budget success lists.
- **Admin Control Panel (`/admin`)**:
  - Add, edit, and delete components manually.
  - Register, edit, delete, and view student profiles.
  - Export Registered Students database to Excel.
  - Generate invitation codes for students.
  - Lock/Unlock pages of the student journey per invitation code batch.
