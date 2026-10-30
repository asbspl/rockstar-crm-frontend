import apiClient from "../../../api/client";

export type OrderStatus =
    | "Draft"
    | "Submitted"
    | "Approved"
    | "Invoiced"
    | "Paid"
    | "Overdue"
    | "Cancelled";

export type DispatchStatus = "Pending" | "Partial" | "Dispatched";

export type OrderItemInput = {
    id?: number;
    product_id: number;
    product_name: string;
    product_code?: string;
    hsn_sac?: string;
    product_description?: string;
    unit: string;
    quantity: number;
    rate_incl_gst: number;
    discount: number;
    amount?: number;
};

export type OrderInput = {
    company_id: number;
    client_id: number;
    customer_id: number | null;
    customer_site_name: string;
    site_id: number | null;
    location_id: number | null;
    proforma_date: string;
    expected_shipping_date: string;
    reference: string;
    comment: string;
    items: OrderItemInput[];
    image1?: File | null;
    image2?: File | null;
    image3?: File | null;
    image4?: File | null;
};

export type DispatchInput = {
    dispatch_sequence_no?: string;
    dispatch_date: string;
    driver_id: number;
    driver_name: string;
    vehicle_no: string;
    vehicle_type: string;
    contact: string;
    dispatch_status: DispatchStatus;
};

export type OrderItem = OrderItemInput & {
    id?: number;
    amount: number;
};

export type Order = {
    id: number;
    pino: string;
    dcsno?: string | null;
    company_id: number;
    company_name: string;
    client_id: number;
    client_name: string;
    customer_id: number | null;
    customer_name: string;
    customer_site_name: string;
    company_address?: string;
    company_gstin?: string;
    company_contact?: string;
    company_email?: string;
    company_logo?: string;
    customer_address?: string;
    customer_gstin?: string;
    customer_contact?: string;
    customer_email?: string;
    site_name?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    pin_code?: string;
    state?: string;
    country?: string;
    site_contact_person?: string;
    site_contact_number?: string;
    site_location_name?: string;
    location_address?: string;
    site_id: number | null;
    location_id: number | null;
    location_name: string;
    proforma_date: string;
    expected_shipping_date: string;
    reference: string;
    comment: string;
    status: OrderStatus;
    items: OrderItem[];
    subtotal: number;
    total_discount: number;
    grand_total: number;
    image1?: string | null;
    image2?: string | null;
    image3?: string | null;
    image4?: string | null;
    dispatch_sequence_no?: string | null;
    dispatch_date?: string | null;
    driver_id?: number | null;
    driver_name?: string;
    vehicle_no?: string;
    vehicle_type?: string;
    contact?: string;
    dispatch_status: DispatchStatus;
    created_at?: string;
    updated_at?: string;
    delivery_challan_provided?: boolean | number | string | null;
    client_delivery_challan_provided?: boolean | number | string | null;

    client_gstin?: string | null;
    client_phone?: string | null;
    client_email?: string | null;
    client_logo?: string | null;

    client_address_line1?: string | null;
    client_address_line2?: string | null;
    client_city?: string | null;
    client_state?: string | null;
    client_pin_code?: string | null;
    client_country?: string | null;
};

export type OrderPagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export type OrderListResult = {
    success: boolean;
    data: Order[];
    pagination: OrderPagination;
};

type ApiEnvelope<T> = {
    success?: boolean;
    message?: string;
    data?: T;
    pagination?: Partial<OrderPagination>;
};

function getErrorMessage(error: unknown, fallback: string): string {
    const value = error as {
        response?: { data?: { message?: string } };
        message?: string;
    };
    return value.response?.data?.message || value.message || fallback;
}

function unwrap<T>(responseData: unknown): T {
    const envelope = responseData as ApiEnvelope<T> | T;
    if (envelope && typeof envelope === "object" && "data" in envelope) {
        return (envelope as ApiEnvelope<T>).data as T;
    }
    return responseData as T;
}

function toFormData(input: OrderInput): FormData {
    const formData = new FormData();
    formData.append("company_id", String(input.company_id));
    formData.append("client_id", String(input.client_id));
    formData.append("customer_id", input.customer_id == null ? "" : String(input.customer_id));
    formData.append("customer_site_name", input.customer_site_name);
    formData.append("site_id", input.site_id == null ? "" : String(input.site_id));
    formData.append("location_id", input.location_id == null ? "" : String(input.location_id));
    formData.append("proforma_date", input.proforma_date);
    formData.append("expected_shipping_date", input.expected_shipping_date);
    formData.append("reference", input.reference);
    formData.append("comment", input.comment);
    formData.append("items", JSON.stringify(input.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        unit: item.unit,
        quantity: Number(item.quantity),
        rate_incl_gst: Number(item.rate_incl_gst),
        discount: Number(item.discount),
    }))));

    (["image1", "image2", "image3", "image4"] as const).forEach((key) => {
        const file = input[key];
        if (file instanceof File) formData.append(key, file);
    });
    return formData;
}

export async function getOrders(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    dispatch?: string;
}): Promise<OrderListResult> {
    try {
        const response = await apiClient.get("api/orders", { params });
        const body = response.data as ApiEnvelope<Order[] | { orders?: Order[]; rows?: Order[]; pagination?: OrderPagination }>;
        const payload = unwrap<Order[] | { orders?: Order[]; rows?: Order[]; pagination?: OrderPagination }>(body);
        const data = Array.isArray(payload) ? payload : payload?.orders ?? payload?.rows ?? [];
        const pagination = body?.pagination ?? (!Array.isArray(payload) ? payload?.pagination : undefined);
        return {
            success: body?.success !== false,
            data,
            pagination: {
                page: Number(pagination?.page ?? params.page),
                limit: Number(pagination?.limit ?? params.limit),
                total: Number(pagination?.total ?? data.length),
                totalPages: Math.max(1, Number(pagination?.totalPages ?? Math.ceil(Number(pagination?.total ?? data.length) / params.limit))),
            },
        };
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to load orders."));
    }
}

export async function getOrder(id: number): Promise<Order> {
    try {
        const response = await apiClient.get(`api/orders/${id}`);
        return unwrap<Order>(response.data);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to load order details."));
    }
}

export async function createOrder(input: OrderInput): Promise<Order> {
    try {
        const response = await apiClient.post("api/orders", toFormData(input));
        return unwrap<Order>(response.data);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to create order."));
    }
}

export async function updateOrder(id: number, input: OrderInput): Promise<Order> {
    try {
        const response = await apiClient.put(`api/orders/${id}`, toFormData(input));
        return unwrap<Order>(response.data);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to update order."));
    }
}

export async function deleteOrder(id: number): Promise<void> {
    try {
        await apiClient.delete(`api/orders/${id}`);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to delete order."));
    }
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    try {
        const response = await apiClient.patch(`api/orders/${id}/status`, { status });
        return unwrap<Order>(response.data);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to update order status."));
    }
}


export async function sendOrderEmail(id: number, type: "PI" | "DC", documentHtml: string): Promise<{ message: string }> {
    try {
        const response = await apiClient.patch(`api/orders/${id}/email`, {
            type,
            document_html: documentHtml,
        });
        const data = response.data as ApiEnvelope<{ message?: string }>;
        return { message: data.message || "Document email sent successfully." };
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to send order document email."));
    }
}

export async function saveDispatch(id: number, input: DispatchInput): Promise<Order> {
    try {
        const response = await apiClient.patch(`api/orders/${id}/dispatch`, input);
        return unwrap<Order>(response.data);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to save dispatch details."));
    }
}
