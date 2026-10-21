
import apiClient from "../../../api/client";

export type EmployeeStatus = "active" | "inactive" | "resign";

export interface Employee {
  id: number;
  employee_code: string;
  employee_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string | null;
  country: string;
  state: string;
  city: string;
  pin_code: string;
  location: string;
  joining_date: string;
  resignation_date: string | null;
  status: EmployeeStatus;
  profile_picture: string | null;
  last_salary_slip: string | null;
  pan_card: string | null;
  aadhar_card: string | null;
  resume: string | null;
  account_statement: string | null;
  experience_certificate: string | null;
  allotment_list: string | null;
}

export interface EmployeeForm {
  employee_code: string;
  employee_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  country: string;
  state: string;
  city: string;
  pin_code: string;
  location: string;
  joining_date: string;
  resignation_date: string;
  status: EmployeeStatus;
  profile_picture: File | null;
  last_salary_slip: File | null;
  pan_card: File | null;
  aadhar_card: File | null;
  resume: File | null;
  account_statement: File | null;
  experience_certificate: File | null;
  allotment_list: File | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface EmployeeListResponse {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function toFormData(form: EmployeeForm): FormData {
  const data = new FormData();

  Object.entries(form).forEach(([key, value]) => {
    if (value instanceof File) {
      data.append(key, value);
    } else if (typeof value === "string" && value.trim() !== "") {
      data.append(key, value);
    }
  });

  return data;
}

export async function getEmployees(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}): Promise<EmployeeListResponse> {
  const response = await apiClient.get<ApiResponse<EmployeeListResponse>>(
    "api/employees",
    { params }
  );

  return response.data.data;
}

export async function getEmployee(id: number): Promise<Employee> {
  const response = await apiClient.get<ApiResponse<Employee>>(
    `api/employees/${id}`
  );

  return response.data.data;
}

export async function createEmployee(
  form: EmployeeForm
): Promise<Employee> {
  const response = await apiClient.post<ApiResponse<Employee>>(
    "api/employees",
    toFormData(form)
  );

  return response.data.data;
}

export async function updateEmployee(
  id: number,
  form: EmployeeForm
): Promise<Employee> {
  const response = await apiClient.put<ApiResponse<Employee>>(
    `api/employees/${id}`,
    toFormData(form)
  );

  return response.data.data;
}

export async function updateEmployeeStatus(
  id: number,
  status: EmployeeStatus
): Promise<Employee> {
  const response = await apiClient.patch<ApiResponse<Employee>>(
    `api/employees/${id}/status`,
    { status }
  );

  return response.data.data;
}

export async function deleteEmployee(id: number): Promise<void> {
  await apiClient.delete(`api/employees/${id}`);
}
