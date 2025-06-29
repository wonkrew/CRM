# 🚀 FormTrack SaaS - Advanced Plan

---

## 🧠 Core Goal

> Empower users to create Organizations, manage multiple websites, and collaboratively track form submissions. Transform raw form data into structured leads through an intuitive field-mapping interface.

---

## ✅ Key Features

| Feature                       | Details                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| 🏢 **Organizations**          | Users sign up and create an Organization. The creator becomes the `Admin`.                              |
| 👥 **User Roles & Permissions** | Admins can invite other users (Editors, Viewers) to their organization with specific permissions.       |
| 🌐 **Website Management**       | Organizations can add multiple websites (e.g., `your-site.com`). Each website gets one tracking script. |
| 📜 **Universal Tracking Script**| A single script per website, placed in the `<head>`, automatically detects all forms on any page.     |
| 🔍 **Form Auto-Discovery**      | The script identifies all forms and sends submissions with `formId`, `formName`, and `pageURL`.         |
| 🗺️ **Field Mapping**            | Per-form interface to map incoming form fields (e.g., `fname`, `email_address`) to standard lead fields (`Name`, `Email`). |
| ✨ **Lead Generation**          | Mapped submissions are displayed as structured "Leads" within the app, categorized by website and form. |
| 📊 **Dashboard & Analytics**    | Central dashboard to view leads, filter by website/form, and see basic analytics.                       |

---

## 🧩 New Architecture Flow

```mermaid
graph TD
    A[User Signs Up] --> B{Creates Organization};
    B -- Becomes --> C[Admin];
    C --> D[Adds a Website, e.g., my-blog.com];
    D --> E{Receives ONE Universal Script};

    subgraph "Client's Website (my-blog.com)"
        F[Header has <script>];
        G[Contact Form];
        H[Newsletter Form];
    end

    E --> F;
    
    subgraph "Data Collection"
      I[User submits 'Contact Form'] --> J[tracker.js sends data with formId: 'contact-form'];
      K[User submits 'Newsletter Form'] --> L[tracker.js sends data with formId: 'newsletter-form'];
    end
    
    J & L --> M[/api/collect];

    subgraph "FormTrack SaaS App"
        M --> N[Raw Submissions DB];
        O[Admin configures Field Mapping for 'contact-form'];
        P[Admin configures Field Mapping for 'newsletter-form'];
        N & O & P --> Q[Leads are generated & displayed];
        C -- Invites --> R[New User (Editor/Viewer)];
        R -- Can View/Edit --> Q;
    end
```

---

## 🛠️ Tech & Data Model Plan

| Area                  | Implementation Details                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------- |
| **Collections (DB)**  | `users`, `organizations`, `websites`, `roles`, `invitations`, `submissions`, `forms`, `mappings` |
| **`tracker.js` v2**     | - Auto-attaches to all form `submit` events.<br/>- Traverses DOM to find `id` or `name` for forms.<br/>- Sends `formId`, `formName`, and `formData`. |
| **`/api/collect`**    | - Accepts `websiteId` (replaces `projectId`).<br/>- Stores `formId` and `formName` with submission data. |
| **`/api/organizations`**| - CRUD for organizations.                                                                |
| **`/api/websites`**   | - CRUD for websites within an organization.                                              |
| **`/api/invitations`**| - API to send invites and manage user roles.                                             |
| **Field Mapping UI**  | - A new page `/websites/[id]/forms/[formId]/mapping`.<br/>- Fetches distinct form fields from submissions.<br/>- Drag-and-drop or dropdown to map fields. |

---

## 🚀 Phased Development Roadmap

| Phase | Task                                                                                          |
| ----- | --------------------------------------------------------------------------------------------- |
| **P1: Foundations (Current)** | - User Auth (Email/Pass).<br/>- Basic project creation (now "Websites").<br/>- `tracker.js` v1. |
| **P2: Organization & Multi-User** | - Implement `organizations` and `roles` collections.<br/>- Refactor `websites` to belong to an org.<br/>- Build user invitation system. |
| **P3: Advanced Tracking**      | - Upgrade `tracker.js` to auto-discover all forms.<br/>- Update `/api/collect` to save `formId/formName`. |
| **P4: Field Mapping Core**     | - Create UI to list auto-discovered forms.<br/>- Build the core field mapping interface for each form. |
| **P5: Leads View**             | - Create a "Leads" page that displays structured data post-mapping.<br/>- Add filtering by website/form. |
| **P6: Polish & Deploy**        | - Refine UI/UX.<br/>- Deploy to Vercel.                                                        |

---

## 📦 Project Name (Example): `FormTrack SaaS`

---

## 🧠 Goal / Use Case

> Let clients track their form submissions from any external website (WordPress, Shopify, etc.) and show analytics + submission data inside your **Next.js+shadcn-ui Dashboard**.

---

## ✅ Core Features Plan

| Feature                  | Details                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| 🔌 Embed Script          | Client site la `<script>` embed panna solluvom                     |
| 📝 Form Intercept        | Script form submit intercept pannum                                |
| 📤 Send Data to API      | Namma Next.js API route ku data POST pannum                        |
| 💾 MongoDB Storage       | Data `projectId`, `formData`, `pageURL`, `submittedAt` store aagum |
| 📊 Dashboard Page (SSR)  | All submissions list + basic metrics                               |
| 🔑 Project ID System     | Per client/project unique ID generate pannuvom                     |
| 🧩 SaaS Ready Structure  | Multiple clients data securely separate pannuvom                   |
| 📁 Export/Filter Options | CSV export, date filters (Future scope)                            |
| 📈 Graphs and Visuals    | Submissions over time, top pages (Future enhancement)              |

---

## 🧩 Architecture Overview

```
Client Website
  |
  |-- <script src="https://yourdomain.com/tracker.js" data-project-id="xyz123">
  |
  v
Form Submit --> tracker.js --> POST /api/collect
                             |
                             v
                    [Next.js API Route]
                             |
                             v
                        MongoDB Collection (submissions)
                             |
                             v
                    /dashboard (SSR page) shows all data
```

---

## 🛠 Tech Stack

| Layer       | Stack Used                  |
| ----------- | --------------------------- |
| Frontend    | Next.js with Tailwind CSS   |
| API Backend | Next.js API Routes          |
| Database    | MongoDB Atlas (Cloud)       |
| Auth        | (Optional) Clerk/Auth.js    |
| Hosting     | Vercel (for frontend + API) |

---

## 📋 Modules Breakdown

### 1. `tracker.js`

* Form submit hook
* Collect all `<input>`/`<textarea>` data
* POST to `/api/collect`

### 2. API Route – `/api/collect`

* Accepts `projectId`, `formData`, `pageURL`, `submittedAt`
* Validates payload
* Stores into MongoDB collection `submissions`

### 3. SSR Dashboard Page – `/dashboard`

* Uses `getServerSideProps()` to fetch submissions
* Lists latest entries with:

  * Project ID
  * Submitted Page
  * Date/time
  * Data (formatted JSON)

---

## 🔐 Security Scope (Later Phase)

* Validate `projectId` exists
* Rate limiting
* Domain whitelisting
* Admin panel for project creation
* JWT token (if client wants to use secure API mode)

---

## 🎯 Deliverable Outcome (for client demo):

* Give embed code
* Ask them to paste in their WordPress / Shopify footer
* Show live form submissions on dashboard
* Optionally: schedule email digest / export weekly

---


Field Mapping & Leads Follow-up: Form la varra data va (eg: your-name, email-address) namma system la standard fields ku (name, email) map panni, adha "Leads" ah manage panradhu.
Future Plan: Idhu oru periya and powerful feature. User role implement pannathuku aprom, namma idhuku oru plan podalam.
Phase 1: Leads Section: "Submissions" nu irukura per ah "Leads" nu maathuvom.
Phase 2: Field Mapping UI: Ovvoru project settings layum, "Unga form field 'full\name' ah engaloda 'Name' field oda connect pannunga" nu solra maadhiri oru UI kondu varalam.
Phase 3: Leads Status: Ovvoru lead kum "New", "Contacted", "Closed" nu status set panra maadhiri features kondu varalam.

---

## 🧑‍💼 Advanced User Management, Teams, Roles & Permissions (Centralized)

### Module Overview
A robust, flexible system for managing users, teams, roles, and permissions within organizations. Supports both team-based and individual user permissions, with full audit logging for all changes.

### Core Concepts
- **Organization**: The top-level entity. Contains users, teams, websites, forms, etc.
- **User**: An individual with access to one or more organizations.
- **Team**: A group of users within an organization (e.g., Sales, Marketing).
- **Role**: A named set of permissions (e.g., Admin, Editor, Viewer, Custom).
- **Permission**: A specific action allowed or denied on a resource (e.g., "can_delete_lead" on **Lead**).
- **Resource**: An entity in the system (Organization, Website, Form, Lead, etc.).
- **Audit Log**: A record of all changes to users, roles, teams, and permissions.

### Features & Capabilities
| Feature | Details |
| --- | --- |
| **Member Management** | Add, remove, and manage users in an organization. |
| **Team Management** | Create, edit, delete teams. Assign users to teams. |
| **Role Assignment** | Assign roles to teams **and/or** directly to users. |
| **Custom Roles** | Create roles with custom sets of permissions. |
| **Granular Permissions** | Define permissions for every action (CRUD, invite, assign, export, etc.) on every resource. |
| **Resource-based Permissions** | Permissions can be scoped to a specific resource (e.g., only certain users can edit Website A). |
| **Role Inheritance** | Effective permissions = Org role + Team roles + Individual roles (most permissive wins, unless explicitly denied). |
| **Direct User Permissions** | Override or supplement team/org roles by assigning permissions straight to a user. |
| **Permission Matrix UI** | Visual grid to manage which roles/teams/users can perform which actions on which resources. |
| **Invitations** | Invite users via email, assign initial role/team. |
| **Role Transfer** | Transfer admin rights, promote/demote users, remove users. |
| **Bulk Actions** | Bulk assign roles, move users between teams, etc. |
| **Audit Log** | Track who did what, when, and to whom/what. |

### Data Model (MongoDB)
- `users` { _id, name, email, … }
- `organizations` { _id, name, ownerId, … }
- `organization_members` { orgId, userId, status, joinedAt }
- `teams` { _id, orgId, name, description }
- `team_members` { teamId, userId }
- `roles` { _id, orgId, name, description, isDefault }
- `role_permissions` { roleId, resource, action, allow/deny }
- `user_roles` { orgId, userId, roleId, resourceId? }
- `team_roles` { teamId, roleId, resourceId? }
- `permissions` { orgId, assigneeType: "user"|"team"|"role", assigneeId, resource, action, allow/deny }
- `invitations` { orgId, email, invitedBy, roleId, teamId, status, sentAt }
- `audit_logs` { orgId, actorId, action, targetType, targetId, details, timestamp }

### API Endpoints (REST)
- `GET/POST /api/organizations/members` – List, add, remove, update members
- `CRUD /api/organizations/teams`
- `CRUD /api/organizations/teams/[teamId]/members`
- `CRUD /api/organizations/roles`
- `PUT   /api/organizations/roles/[roleId]/permissions`
- `POST  /api/organizations/user-roles` – Direct user role assignments
- `POST  /api/organizations/team-roles` – Team role assignments
- `POST  /api/organizations/permissions` – Fine-grained custom permissions
- `POST  /api/organizations/invitations` – Send / accept / revoke invites
- `GET   /api/organizations/audit-log` – Paginated audit records

### Permission Logic
1. Gather user's org role(s), team role(s), direct role(s).
2. Combine all `allow` permissions (union).
3. Remove any permission explicitly `deny`-ed (deny overrides allow).
4. Apply resource filters (if `resourceId` present).

### UI/UX
- Organization Settings page with tabs: **Members · Teams · Roles · Permissions · Audit Log**
- Permission Matrix: drag-and-edit grid.
- Member detail drawer: shows effective permissions and source (org vs team vs direct).
- Audit Log viewer: filter by user, action, resource, date.

### Roadmap Update
Add new phase:
| Phase | Task |
| --- | --- |
| **P2.5: Advanced User Management** | Build user/team management dashboard, custom roles & permissions, direct user roles, permission matrix UI, full audit log. |

### Summary
A centralized, flexible, and auditable system for managing who can do what across the entire FormTrack platform.
