export type AdminStatus = "pending" | "under_review" | "approved" | "rejected" | "suspended" | "changes_requested" | string;

export interface AdminApplicationSummary {
  id: string | number;
  applicationReference?: string;
  applicantName?: string;
  email?: string;
  status?: AdminStatus;
  submittedAt?: string;
}

export interface AdminUserSummary {
  id: string | number;
  email?: string;
  name?: string;
  status?: string;
  roles?: string[];
}
