# CLASSPULSE: UNIVERSAL ATTENDANCE & ACADEMIC SCHEDULING SYSTEM
## Comprehensive Operations Manual & Beta Tester Evaluation Guide
*Document Version: 2.1.0 (Production Beta Review)*  
*Target Environment: Cloud Run Containers + Firebase Firestore + Client-Side Hybrid Storage*

---

## 1. EXECUTIVE OVERVIEW & ARCHITECTURE
ClassPulse is an advanced, high-performance, university-grade academic scheduling and real-time attendance management platform. It is engineered specifically for modern educational campuses requiring high-speed data synchronization, accessibility-first user interfaces, and robust multi-role coordination (Student, Faculty, and System Administrator).

### Core Runtime Stack
- **Frontend Core**: React 18+ powered by Vite & TypeScript (Strict Type Safety).
- **Styling Architecture**: Tailwind CSS Engine with custom theme declarations.
- **Micro-Animations**: Framer Motion (`motion/react`) for seamless physics-based transitions.
- **Persistent Data Store**: Hybrid setup utilizing real-time **Firebase Firestore** synchronized with a defensive client-side browser **SafeLocalStorage** caching engine to prevent data-loss in low-bandwidth university networks.
- **Analytics Visualizer**: Recharts / SVG Engine for highly granular, interactive metrics tracking.

---

## 2. COMPREHENSIVE DESIGN TOKENS & VISUAL IDENTITY

### 2.1 Typography Strategy
Our typographic system is calculated to maximize readability across diverse devices while maintaining a high-fidelity, polished, technical display posture.

- **Primary Body Font**: **Inter** (`sans-serif`)
  - *Attributes*: Clean, high-legibility geometric sans-serif tuned for low-glare screen reading.
  - *Used for*: All forms, list items, description content, and helper texts.
- **Display Headings**: **Space Grotesk** / **Outfit** (`sans-serif`)
  - *Attributes*: Tech-forward, high-contrast, modern geometric tracking with tight letter-spacing (`tracking-tight`).
  - *Used for*: Page titles, card headers, and statistics blocks.
- **System Metrics & Monospace**: **JetBrains Mono** (`monospace`)
  - *Attributes*: Perfect vertical-align balance, highly visible digit glyphs, readable at micro-scales (down to `8px`).
  - *Used for*: Timestamps, attendance percentages, room numbers, security hashes, and latency indicators.

### 2.2 Color Palette (High-Contrast Slate & Emerald Theme)
- **Primary Accent (Emerald)**: `bg-emerald-500` / `text-emerald-500`
  - High-visibility neon emerald, represents active states, successful scans, and high attendance (>90%).
- **Warning States (Amber)**: `bg-amber-500` / `text-amber-500`
  - Warns of mid-range attendance metrics, scheduling conflicts, or tardiness markers.
- **Alert States (Red)**: `bg-red-500` / `text-red-500`
  - Critical failures, absent records, or maximum schedule capacity limits.
- **Base Canvas (Light Mode)**: Soft off-white backgrounds with high-contrast slate borders (`border-zinc-200`) and charcoal-gray typography (`text-zinc-900`).
- **Base Canvas (Dark Mode)**: Deep charcoal-zinc backdrops (`bg-zinc-950`) with rich dark borders (`border-zinc-850`) and white text (`text-zinc-100`).

### 2.3 Iconography Design Language
All structural and visual status indicators are sourced strictly from the vector icon library **`lucide-react`** to avoid pixelation or unstyled custom SVG bloat.
- `CalendarDays` / `Calendar`: Represents scheduling slots and date-picker interfaces.
- `Scan` / `Camera`: Represents the QR scanner and visual scan-active states.
- `Wifi` / `WifiOff`: Live status indicator displaying current network/sync status.
- `CheckCircle`: Represents validated check-ins and successful operations.
- `AlertTriangle`: Marks scheduling overlaps, room conflicts, or extreme date bounds.

---

## 3. CORE FUNCTIONAL SYSTEMS & ROLE FLOWS

### 3.1 Student Portal (DashboardStudent)
Designed for frictionless everyday use, allowing students to verify schedules, view metrics, and sign into lectures quickly.

1. **Integrated QR Code Camera Scanner**:
   - High-performance web-capture engine with frame-by-frame canvas extraction.
   - Live camera resolution display with dynamic latency feedback.
   - Fully automatic detection that captures security check-in codes in-frame.
2. **Dynamic Trends Analytics Chart**:
   - Built with customizable view presets: **Daily**, **Weekly**, or **Monthly** intervals.
   - **Steady Y-Axis Anchor**: The attendance rates (0% to 100%) remain locked in position on the left margin, allowing students to scroll horizontally through dates cleanly without losing vertical reference bounds.
   - **Strict 6-Month Date Restriction**: Date window adjustments are limited to a maximum of 6 months. Any attempt to query beyond a 6-month margin is blocked immediately with a red alert notice to prevent memory overload.
   - Simple date indicators (dates only) without confusing redundant suffixes.
3. **Subject Cards & Detail Modals**:
   - Interactive subject list displaying current progress, streak counters, and live registration cards.
   - Detail modals offering detailed historical check-in logs.

### 3.2 Faculty Portal (DashboardFaculty)
Empowers professors to design academic structures, log manual checks, and resolve room logistics cleanly.

1. **Dynamic Conflict-Free Room Scheduler**:
   - Fully integrated university room registry featuring live floor locations and status tags.
   - **Self-Auditing Room Registry Selector**: Eliminates human scheduling errors. When a professor creates a class, the selector automatically cross-references all registered rooms with the selected day and time slots, rendering a clean selection dropdown.
   - If no rooms are physically vacant, the system displays an animated warning panel: *"⚠️ No available laboratory/lecture rooms found in the registry for this schedule day/time."* and disables class creation until the parameters are modified.
2. **Attendance Management Registry**:
   - Complete grid interface to manually log student attendance states (Present, Late, Absent).
   - Generates real-time averages for class records instantly.

### 3.3 Administrator Portal (DashboardAdmin)
Serves as the core system dashboard for database maintenance, audit logging, and global campus data synchronization.

1. **Real-time Database Monitor**:
   - Visualizes live synchronization threads between the browser state and Firestore.
   - Manual overrides to force cloud-wide schema resets.
2. **User Profiles Registry**:
   - Edit, delete, and add students or faculty members.
   - Modify authorization permissions and institutional IDs.

---

## 4. USABILITY & ACCESSIBILITY SPECIFICATIONS
ClassPulse conforms to accessibility requirements to ensure that every student, regardless of physical ability, has an equitable experience.

- **Dynamic Text Reader (Speech Synthesis)**: Built-in text-to-speech toggles read aloud scanner status, form selections, and error notifications in real-time.
- **Dynamic Scale Adjustments**: Responsive typography allows screen zoom adjustments without breaking container structures or causing horizontal overlap.
- **Strict Color Contrast**: Minimum contrast ratio of 4.5:1 on all informational typography labels against light/dark backdrops.
- **Optimized Touch Elements**: Fully compliant touch targets measuring at least 44px × 44px on mobile viewport formats.

---

## 5. BETA TESTER EVALUATION SHEET (PRINTABLE)
*Please convert or copy this markdown template to a Word (.docx) document or print directly to evaluate ClassPulse during the operational review phase.*

### Beta Tester Metadata
- **Tester Name**: ___________________________
- **Date of Evaluation**: ____ / ____ / 2026
- **Device Used**: (e.g. iPhone 14, Galaxy S23, iPad Air, MacBook Pro 14") _________________
- **Role Under Evaluation**: [  ] Student   [  ] Faculty   [  ] Admin

---

### Evaluation Criteria (Likert Scale: 1 = Poor, 5 = Excellent)

#### A. Visual Appeal & Interface Layout (Typography & Design)
1. **Font Legibility**: Are the "Inter", "Space Grotesk", and "JetBrains Mono" typefaces highly legible across multiple sizes?  
   `[ 1 ]   [ 2 ]   [ 3 ]   [ 4 ]   [ 5 ]`  
   *Notes*: ____________________________________________________________________

2. **Color Palette Contrast**: Are state markers (Emerald/Amber/Red) clearly distinguishable under bright classroom lighting?  
   `[ 1 ]   [ 2 ]   [ 3 ]   [ 4 ]   [ 5 ]`  
   *Notes*: ____________________________________________________________________

3. **Responsive Flow**: Does the sidebar menu collapse and adapt smoothly between desktop and mobile portrait views?  
   `[ 1 ]   [ 2 ]   [ 3 ]   [ 4 ]   [ 5 ]`  
   *Notes*: ____________________________________________________________________

---

#### B. Functional Integration (Scheduling & Attendance Flow)
4. **Interactive Graph Navigation**: Does the attendance chart Y-Axis remain stable/steady on scroll? Are dates clearly readable without redundant clutter?  
   `[ 1 ]   [ 2 ]   [ 3 ]   [ 4 ]   [ 5 ]`  
   *Notes*: ____________________________________________________________________

5. **6-Month Date Window Safety Limit**: Try selecting a date range greater than 6 months. Does the system successfully block the action and warn you?  
   `[ 1 ]   [ 2 ]   [ 3 ]   [ 4 ]   [ 5 ]`  
   *Notes*: ____________________________________________________________________

6. **Self-Auditing Room Registry Selector (Faculty)**: Try creating a class at an overlapping time with an already-booked room. Does the selector successfully hide overlapping rooms and show the warning message?  
   `[ 1 ]   [ 2 ]   [ 3 ]   [ 4 ]   [ 5 ]`  
   *Notes*: ____________________________________________________________________

---

#### C. Usability & Assistive Tech
7. **Audio Accessibility (Text-to-Speech)**: Did turning on the "Read Aloud" toggle announce your scheduled selections and error alerts clearly?  
   `[ 1 ]   [ 2 ]   [ 3 ]   [ 4 ]   [ 5 ]`  
   *Notes*: ____________________________________________________________________

8. **General Response Speed**: Is the application responsive when shifting between Student, Faculty, and Admin dashboards?  
   `[ 1 ]   [ 2 ]   [ 3 ]   [ 4 ]   [ 5 ]`  
   *Notes*: ____________________________________________________________________

---

### Overall Evaluator Comments & Recommendations
__________________________________________________________________________________________
__________________________________________________________________________________________
__________________________________________________________________________________________
__________________________________________________________________________________________

*Signature of Evaluator*: ___________________________________  *Date*: ____/____/2026
