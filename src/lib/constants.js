// MongoDB Configuration
export const MONGODB_URI = process.env.MONGODB_URI;
export const DB_NAME = process.env.MONGODB_DB;

// Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  MEMBERSHIPS: 'memberships',
  WEBSITES: 'websites',
  FORMS: 'forms',
  SUBMISSIONS: 'submissions',
  MAPPINGS: 'mappings',
  ROLES: 'roles',
  ROLE_PERMISSIONS: 'role_permissions',
  USER_ROLES: 'user_roles',
  TEAM_ROLES: 'team_roles',
  TEAMS: 'teams',
  TEAM_MEMBERS: 'team_members',
  PERMISSIONS: 'permissions',
  INVITATIONS: 'invitations',
  AUDIT_LOGS: 'audit_logs',
  FOLLOWUPS: 'followups'
};

// Resource Types for Permissions
export const RESOURCES = {
  MEMBERS: "members",
  TEAMS: "teams",
  ROLES: "roles",
  FORMS: "forms",
  LEADS: "leads",
  WEBSITES: "websites",
  SUBMISSIONS: "submissions",
  SETTINGS: "settings",
  AUDIT_LOG: "audit_log"
};

// Action Types for Permissions
export const ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
  MANAGE: "manage",
  ASSIGN: "assign"
};

// Role Types
export const DEFAULT_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer"
};

// Default permissions for built-in roles
export const DEFAULT_ROLE_PERMISSIONS = {
  [DEFAULT_ROLES.OWNER]: {
    [RESOURCES.MEMBERS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.MANAGE],
    [RESOURCES.TEAMS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.MANAGE],
    [RESOURCES.ROLES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.MANAGE],
    [RESOURCES.FORMS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.MANAGE],
    [RESOURCES.LEADS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.MANAGE],
    [RESOURCES.WEBSITES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.MANAGE],
    [RESOURCES.SUBMISSIONS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.MANAGE],
    [RESOURCES.SETTINGS]: [ACTIONS.VIEW, ACTIONS.EDIT, ACTIONS.MANAGE],
    [RESOURCES.AUDIT_LOG]: [ACTIONS.VIEW]
  },
  [DEFAULT_ROLES.ADMIN]: {
    [RESOURCES.MEMBERS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [RESOURCES.TEAMS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [RESOURCES.ROLES]: [ACTIONS.VIEW],
    [RESOURCES.FORMS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [RESOURCES.LEADS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [RESOURCES.WEBSITES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [RESOURCES.SUBMISSIONS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [RESOURCES.SETTINGS]: [ACTIONS.VIEW, ACTIONS.EDIT],
    [RESOURCES.AUDIT_LOG]: [ACTIONS.VIEW]
  },
  [DEFAULT_ROLES.MEMBER]: {
    [RESOURCES.MEMBERS]: [ACTIONS.VIEW],
    [RESOURCES.TEAMS]: [ACTIONS.VIEW],
    [RESOURCES.ROLES]: [ACTIONS.VIEW],
    [RESOURCES.FORMS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [RESOURCES.LEADS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [RESOURCES.WEBSITES]: [ACTIONS.VIEW],
    [RESOURCES.SUBMISSIONS]: [ACTIONS.VIEW, ACTIONS.CREATE],
    [RESOURCES.SETTINGS]: [ACTIONS.VIEW],
    [RESOURCES.AUDIT_LOG]: []
  },
  [DEFAULT_ROLES.VIEWER]: {
    [RESOURCES.MEMBERS]: [ACTIONS.VIEW],
    [RESOURCES.TEAMS]: [ACTIONS.VIEW],
    [RESOURCES.ROLES]: [ACTIONS.VIEW],
    [RESOURCES.FORMS]: [ACTIONS.VIEW],
    [RESOURCES.LEADS]: [ACTIONS.VIEW],
    [RESOURCES.WEBSITES]: [ACTIONS.VIEW],
    [RESOURCES.SUBMISSIONS]: [ACTIONS.VIEW],
    [RESOURCES.SETTINGS]: [ACTIONS.VIEW],
    [RESOURCES.AUDIT_LOG]: []
  }
};

// Submission Status Types
export const SUBMISSION_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  CONVERTED: 'converted',
  LOST: 'lost'
};

// Follow-up Types
export const FOLLOWUP_TYPES = {
  EMAIL: 'email',
  CALL: 'call',
  MEETING: 'meeting',
  NOTE: 'note'
};

// Audit Log Action Types
export const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  INVITE: 'invite',
  ASSIGN: 'assign',
  REMOVE: 'remove'
};

// Collection Indexes
export const INDEXES = {
  [COLLECTIONS.USERS]: [
    { key: { email: 1 }, unique: true }
  ],
  [COLLECTIONS.MEMBERSHIPS]: [
    { key: { userId: 1, organizationId: 1 }, unique: true },
    { key: { organizationId: 1 } }
  ],
  [COLLECTIONS.WEBSITES]: [
    { key: { organizationId: 1 } },
    { key: { url: 1 } }
  ],
  [COLLECTIONS.SUBMISSIONS]: [
    { key: { websiteId: 1 } },
    { key: { formId: 1 } },
    { key: { submittedAt: -1 } }
  ],
  [COLLECTIONS.FOLLOWUPS]: [
    { key: { leadId: 1 } },
    { key: { userId: 1 } },
    { key: { reminderAt: 1 } }
  ],
  [COLLECTIONS.AUDIT_LOGS]: [
    { key: { orgId: 1 } },
    { key: { timestamp: -1 } }
  ]
}; 