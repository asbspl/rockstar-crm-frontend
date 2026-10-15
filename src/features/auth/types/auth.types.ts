export type AuthUserStatus =
  | "active"
  | "inactive"
  | "pending"
  | "pending_approval"
  | "under_review"
  | "approved"
  | "rejected"
  | "suspended"
  | "changes_requested"
  | string;

export interface AuthUser {
  id: number | string;
  email: string;
  full_name?: string | null;
  name?: string | null;
  status?: AuthUserStatus;
  roles: string[];
  permissions: string[];
}

export interface AuthSession {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  roles?: string[];
  permissions?: string[];
  status?: AuthUserStatus;
}

export interface AuthApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  status?: string;
  meta?: Record<string, unknown>;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegistrationStatusRecord {
  applicationReference?: string;
  application_reference?: string;
  reference?: string;
  status?: AuthUserStatus;
  submittedAt?: string;
  submissionDate?: string;
  submitted_at?: string;
  reviewerFeedback?: string;
  reviewer_feedback?: string;
  feedback?: string;
  nextStep?: string;
  next_step?: string;
  canResubmit?: boolean;
  resubmitAllowed?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  newPassword?: string;
}

