
import apiClient from "../../../api/client";

export interface Company {
  id: number;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  pin_code: string | null;
  company_logo: string | null;
  company_signature: string | null;
  bank_details: string | null;
  terms_and_conditions: string | null;
  pan_number: string | null;
  pan_document: string | null;
  gst_number: string | null;
  gst_certificate: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CompanyListResponse {
  success: boolean;
  data: {
    companies: Company[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface CompanyCreateResponse {
  success: boolean;
  message: string;
  data: { company: Company };
}

export async function getCompanies(params: {
  page: number;
  limit: number;
  search: string;
})
 {
  const response = await apiClient.get<CompanyListResponse>(
    "/api/companies",
    { params }
  );

  return response.data.data;
}

export async function createCompany(formData: FormData) {
  const response = await apiClient.post<CompanyCreateResponse>(
    "/api/companies",
    formData
  );

  return response.data;
}

export async function updateCompany(id: number, formData: FormData) {
  const response = await apiClient.put(
    `/api/companies/${id}`,
    formData
  );
  return response.data;
}

export async function deleteCompany(id: number) {
  const response = await apiClient.delete(
    `/api/companies/${id}`
  );
  return response.data;
}