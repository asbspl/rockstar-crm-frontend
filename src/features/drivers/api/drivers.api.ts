
import apiClient from "../../../api/client";

export interface Driver {
  id: number;
  driver_full_name: string | null;
  vehicle_number: string | null;
  contact_no: string | null;
  aadhar_card_document: string | null;
  vehicle_registration_document: string | null;
  vehicle_type: string | null;
  status: "Active" | "Inactive";
  created_at: string;
  updated_at?: string;
}

export interface DriverList {
  rows: Driver[];
  total: number;
  page: number;
  limit: number;
}

export interface DriverInput {
  driver_full_name: string;
  vehicle_number: string;
  contact_no: string;
  vehicle_type: string;
  status: "" | "Active" | "Inactive";
  aadhar_card_document?: File | null;
  vehicle_registration_document?: File | null;
}


function toFormData(data: DriverInput) {
  const form = new FormData();

  form.append("driver_full_name", data.driver_full_name);
  form.append("vehicle_number", data.vehicle_number);
  form.append("contact_no", data.contact_no);
  form.append("vehicle_type", data.vehicle_type);

  // Add the selected status
  if (data.status) {
    form.append("status", data.status);
  }

  if (data.aadhar_card_document) {
    form.append("aadhar_card_document", data.aadhar_card_document);
  }

  if (data.vehicle_registration_document) {
    form.append(
      "vehicle_registration_document",
      data.vehicle_registration_document
    );
  }

  return form;
}


export async function getDrivers(params: {
  page: number;
  limit: number;
  search: string;
}) {
  const response = await apiClient.get("api/drivers", { params });
  return response.data.data as DriverList;
}

export async function getDriver(id: number) {
  const response = await apiClient.get(`api/drivers/${id}`);
  return response.data.data as Driver;
}

export async function createDriver(data: DriverInput) {
  const response = await apiClient.post("api/drivers", toFormData(data));
  return response.data.data as Driver;
}

export async function updateDriver(id: number, data: DriverInput) {
  const response = await apiClient.put(
    `api/drivers/${id}`,
    toFormData(data)
  );
  return response.data.data as Driver;
}

export async function updateDriverStatus(
  id: number,
  status: "Active" | "Inactive"
) {
  const response = await apiClient.patch(`api/drivers/${id}/status`, {
    status,
  });

  return response.data.data as Driver;
}

export async function deleteDriver(id: number) {
  await apiClient.delete(`api/drivers/${id}`);
}
