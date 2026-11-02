# Group 19: Manufacturing Production Planning & Quality Control System

An enterprise-grade, integrated Single Page Application (SPA) designed for manufacturing plants. The system unifies production planning, machine scheduling, bill of materials (BOM), raw material inventory control, quality inspections, defect tracking, corrective actions (CAPA), machine downtime monitoring, and yield analytics into a cohesive industrial ERP platform.

---

## 👥 Project Team Ownership & Roles

This application was collaboratively designed and implemented as an integrated system divided into four distinct member domains:

| Team Member | Domain / Module | Key Functional Responsibilities |
|---|---|---|
| **Member 1** | **Production Orders, Work Centres & Scheduling** | • Production order lifecycle (`Planned`, `In Progress`, `Completed`, `On Hold`, `Cancelled`).<br>• Work centre machine profiles, capacity definitions, and operational availability.<br>• Gantt-style timeline scheduling, work centre assignments, and overlap conflict detection. |
| **Member 2** | **Raw Materials, Bill of Materials & Inventory** | • Raw materials master catalog with safety stock levels and supplier tracking.<br>• Multi-material Bill of Materials (BOM) with dynamic batch requirements calculator.<br>• Stock transactions: Receipts, Consumptions, Reservations, and Adjustments with audit trail. |
| **Member 3** | **Quality Inspections, Defects & Corrective Actions** | • Batch inspections with dynamic multi-criterion checkpoints (`Pass`/`Fail`/`N/A`).<br>• Defect classification by severity and category with resolution lifecycle tracking.<br>• Corrective and Preventive Actions (CAPA) with assigned owners, target deadlines, and overdue alerts. |
| **Member 4** | **Central Dashboard, Downtime & Yield Analytics** | • Consolidated executive dashboard with 12 synchronized live KPI cards.<br>• Machine downtime monitoring with root-cause categorization and quick "End Outage" actions.<br>• Overall Factory Yield %, Scrap Rate %, planned vs actual production bar charts, and machine rankings. |

---

## 🛠️ Technology Stack

- **Framework**: Angular 22 (Standalone Components Architecture)
- **Language**: TypeScript (`.ts`) with strict typing and interfaces
- **Templates**: Angular HTML Templates with control flow (`@if`, `@for`, `@switch`)
- **Styling**: Pure CSS (`.css`) with an industrial ERP design system (no SCSS/SASS/LESS)
- **Persistence**: Centralized `localStorage` client-side data service with preloaded demo data and one-click database reset
- **Visualization**: Lightweight, responsive pure-CSS bar charts and progress indicators (no external chart bloat)

---

## 🔄 Core Integrated Workflows

The four modules communicate seamlessly through a centralized [`DataService`](src/app/core/services/data.service.ts):

```
[ Production Order Created ]
            │
            ▼
[ BOM Recipe & Material Requirements Checked ] ──► [ Stock Shortage Warning / Reservation ]
            │
            ▼
[ Work Centre Assigned & Scheduled ] ───────────► [ Overlap Conflict Validation ]
            │
            ▼
[ Production Starts / In Progress ] ────────────► [ Raw Materials Consumed from Inventory ]
            │
            ▼
[ Quality Inspection Performed ] ──────────────► [ Defects Logged if Checkpoints Fail ]
            │                                                    │
            ▼                                                    ▼
[ Yield & Analytics Updated on Dashboard ] ◄────── [ Corrective Actions (CAPA) Created ]
```

1. **Production Planning**: Selecting a finished product dynamically retrieves its Bill of Materials, computes required raw materials against current inventory, and flags shortages before scheduling.
2. **Inventory Consumption**: When production commences, raw materials are deducted from inventory, audit entries are recorded, and duplicate consumption is programmatically prevented.
3. **Quality & Traceability**: Quality inspections reference specific orders and batches. Detected failures can be escalated into logged defects, which in turn spawn trackable Corrective Actions.
4. **Consolidated Analytics**: Every chart, percentage, and KPI card on the executive dashboard reflects live data from production, inventory, quality, and downtime records.

---

## 📁 Project Directory Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   └── interfaces.ts          # Central TypeScript interfaces & data models
│   │   └── services/
│   │       ├── data.service.ts        # Centralized localStorage repository & business logic
│   │       └── notification.service.ts# Toast notification alert service
│   ├── layout/
│   │   ├── header.component.*         # System status, live plant clock, supervisor profile
│   │   └── sidebar.component.*        # Collapsible dark ERP navigation sidebar
│   ├── modules/
│   │   ├── dashboard/
│   │   │   ├── dashboard.component.*  # Central executive overview & KPI cards
│   │   │   ├── downtime.component.*   # Machine outage logging & category breakdowns
│   │   │   └── yield-analytics.component.* # Yield %, scrap rate, planned vs actual
│   │   ├── materials/
│   │   │   ├── raw-materials.component.*   # Material catalog & low-stock alerts
│   │   │   ├── bom.component.*             # Bill of Materials & requirements calculator
│   │   │   └── inventory.component.*       # Stock receipts, consumptions, and ledger
│   │   ├── production/
│   │   │   ├── production-orders.component.*     # Order table, progress & BOM modal
│   │   │   ├── production-order-form.component.* # Create/Edit order with shortage checks
│   │   │   ├── work-centres.component.*          # Machine capacity & availability toggle
│   │   │   └── scheduling.component.*            # Timeline scheduling & conflict engine
│   │   └── quality/
│   │       ├── inspections.component.*        # Batch inspections & dynamic checkpoints
│   │       ├── defects.component.*            # Defect logging & severity breakdown
│   │       └── corrective-actions.component.* # CAPA remediation & overdue tracking
│   ├── app.routes.ts                  # Lazy-loaded Angular route configuration
│   ├── app.ts / app.html / app.css    # Root component shell
│   └── app.config.ts                  # Application configuration & providers
└── styles.css                         # Global industrial ERP stylesheet
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x, 20.x, or 22.x recommended)
- [npm](https://www.npmjs.com/) (version 9.x or higher)
- [Angular CLI](https://angular.dev/) (optional, or run directly via `npm`)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/krushnanannaware/Manufacturing-Production-Planning-Quality-Control-System.git
   cd Manufacturing-Production-Planning-Quality-Control-System
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Launch the application**:
   Open your browser and navigate to:
   ```
   http://localhost:4200/
   ```

### Building for Production

To create a production-optimized build:
```bash
npm run build
```
Output bundles will be stored in the `dist/manufacturing-app` folder.

---

## 🧪 Demonstration Data & Reset

The system initializes with realistic demo data representing a discrete mechanical manufacturing plant:
- **5 Finished Products**: Gear Assemblies, Brackets, Wire Harnesses, Housing Units, Valves.
- **5 Work Centres**: CNC Machining, Assembly Lines, Welding Stations, Injection Moulding Units, QC Lab.
- **8 Raw Materials**: Carbon steel, aluminum sheets, copper wire, plastics, stainless steel, lubricants, seals.
- **Pre-configured BOMs, Production Orders, Quality Inspections, Defects, and Downtime Logs**.

> **Tip**: Click the **"Reset Data"** button in the top navigation header or sidebar footer at any time to restore the demonstration database back to its default state.

---

## 📜 Academic Compliance

Developed in accordance with the Academic Project Requirements for **Group 19**:
- **Zero Third-Party Dependency Overhead**: Charting and timeline visuals built purely with Angular template control flow and CSS.
- **High-Integrity Business Logic**: Foreign-key checks prevent deletion of materials tied to active BOMs or orders linked to quality audits.
- **Clean Component Hierarchy**: Decoupled presentation, data services, and type-safe domain models.
