
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

export type CompanyStatusFilter = "all" | "active" | "inactive";

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

interface GetCompaniesParams {
  page: number;
  limit: number;
  search: string;
  status?: CompanyStatusFilter;
}

export async function getCompanies({
  page,
  limit,
  search,
  status = "all",
}: GetCompaniesParams) {
  const response = await apiClient.get<CompanyListResponse>(
    "/api/companies",
    {
      params: {
        page,
        limit,
        search,
        // "all" means no status restriction
        ...(status !== "all" ? { status } : {}),
      },
    }
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

export async function updateCompanyStatus(
  id: number,
  company: Company,
  status: "active" | "inactive"
) {
  const formData = new FormData();

  formData.append("companyName", company.company_name || "");
  formData.append("phone", company.phone || "");
  formData.append("email", company.email || "");
  formData.append("addressLine1", company.address_line1 || "");
  formData.append("addressLine2", company.address_line2 || "");
  formData.append("country", company.country || "India");
  formData.append("state", company.state || "");
  formData.append("city", company.city || "");
  formData.append("pinCode", company.pin_code || "");
  formData.append("bankDetails", company.bank_details || "");
  formData.append(
    "termsAndConditions",
    company.terms_and_conditions || ""
  );
  formData.append("panNumber", company.pan_number || "");
  formData.append("gstNumber", company.gst_number || "");
  formData.append("status", status);

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
