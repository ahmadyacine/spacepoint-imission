# SpacePoint Mission Portal - Version Control

This document tracks all version releases, features, updates, and bug fixes for the SpacePoint Mission Portal educational platform.

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
