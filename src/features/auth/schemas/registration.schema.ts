export type RegistrationFormState = {
  name: string;
  phone: string;
  email: string;
  password: string;
  addressLine1: string;
  addressLine2: string;
  location: string;
  state: string;
  city: string;
  pinCode: string;
  panNumber: string;
  aadhaarNumber: string;
  paymentUpi: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  privacyAccepted: boolean;
};

export type RegistrationErrors = Partial<
  Record<keyof RegistrationFormState, string>
> & {
  panCard?: string;
  aadhaarCard?: string;
};

export const EMPTY_REGISTRATION_FORM: RegistrationFormState = {
  name: "",
  phone: "",
  email: "",
  password: "",
  addressLine1: "",
  addressLine2: "",
  location: "",
  state: "",
  city: "",
  pinCode: "",
  panNumber: "",
  aadhaarNumber: "",
  paymentUpi: "",
  accountName: "",
  accountNumber: "",
  ifscCode: "",
  privacyAccepted: false,
};

export function formatFileSize(sizeInBytes: number): string {
  if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = sizeInBytes;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function maskValue(value: string, visibleDigits = 4): string {
  const normalized = value.replace(/\s+/g, "");

  if (!normalized) {
    return "";
  }

  if (normalized.length <= visibleDigits) {
    return `${"*".repeat(
      Math.max(normalized.length - 1, 0),
    )}${normalized.slice(-1)}`;
  }

  const visiblePart = normalized.slice(-visibleDigits);
  const maskedPart = "*".repeat(
    Math.max(normalized.length - visibleDigits, 1),
  );

  return `${maskedPart}${visiblePart}`;
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  valid: boolean;
} {
  if (!password) {
    return { score: 0, label: "Not started", valid: false };
  }

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  const score = checks.filter(Boolean).length;

  if (score <= 2) {
    return { score, label: "Weak", valid: false };
  }

  if (score <= 4) {
    return { score, label: "Good", valid: true };
  }

  return { score, label: "Strong", valid: true };
}

export function validateRegistrationForm(
  form: RegistrationFormState,
  files: {
    panCard?: File | null;
    aadhaarCard?: File | null;
  },
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  // Name
  if (!form.name.trim()) {
    errors.name = "Name is required.";
  } else if (form.name.trim().length < 2) {
    errors.name = "Name must contain at least 2 characters.";
  }

  // Phone
  if (!form.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!/^\+?[0-9\s-]{10,15}$/.test(form.phone.trim())) {
    errors.phone = "Enter a valid phone number.";
  }

  // Email
  if (!form.email.trim()) {
    errors.email = "Email ID is required.";
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  ) {
    errors.email = "Enter a valid email address.";
  }

  // Password
  if (!form.password) {
    errors.password = "Password is required.";
  } else if (
    form.password.length < 8 ||
    form.password.length > 128
  ) {
    errors.password =
      "Password must be between 8 and 128 characters.";
  }

  // Address
  if (!form.addressLine1.trim()) {
    errors.addressLine1 = "Address line 1 is required.";
  }

  if (!form.location.trim()) {
    errors.location = "Location is required.";
  }

  if (!form.state.trim()) {
    errors.state = "State is required.";
  }

  if (!form.city.trim()) {
    errors.city = "City is required.";
  }

  if (!form.pinCode.trim()) {
    errors.pinCode = "Pin code is required.";
  } else if (!/^\d{6}$/.test(form.pinCode.trim())) {
    errors.pinCode = "Pin code must be 6 digits.";
  }

  // PAN
  if (!form.panNumber.trim()) {
    errors.panNumber = "PAN Number is required.";
  } else if (
    !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
      form.panNumber.trim().toUpperCase(),
    )
  ) {
    errors.panNumber = "Enter a valid PAN number.";
  }

  // PAN document
  if (!files.panCard) {
    errors.panCard = "Upload the PAN card.";
  } else if (
    !["image/png", "image/jpeg", "application/pdf"].includes(
      files.panCard.type,
    )
  ) {
    errors.panCard = "PAN card must be a PNG, JPG, or PDF file.";
  } else if (files.panCard.size > 5 * 1024 * 1024) {
    errors.panCard = "PAN card must be smaller than 5 MB.";
  }

  // Aadhaar
  if (!form.aadhaarNumber.trim()) {
    errors.aadhaarNumber = "Aadhaar Number is required.";
  } else if (!/^\d{12}$/.test(form.aadhaarNumber.trim())) {
    errors.aadhaarNumber =
      "Aadhaar Number must contain 12 digits.";
  }

  // Aadhaar document
  if (!files.aadhaarCard) {
    errors.aadhaarCard = "Upload the Aadhaar card.";
  } else if (
    !["image/png", "image/jpeg", "application/pdf"].includes(
      files.aadhaarCard.type,
    )
  ) {
    errors.aadhaarCard =
      "Aadhaar card must be a PNG, JPG, or PDF file.";
  } else if (files.aadhaarCard.size > 5 * 1024 * 1024) {
    errors.aadhaarCard =
      "Aadhaar card must be smaller than 5 MB.";
  }

  // Payment details
  if (!form.paymentUpi.trim()) {
    errors.paymentUpi = "Payment UPI ID is required.";
  }

  if (!form.accountName.trim()) {
    errors.accountName = "Account Name is required.";
  }

  if (!form.accountNumber.trim()) {
    errors.accountNumber = "Account Number is required.";
  }

  if (!form.ifscCode.trim()) {
    errors.ifscCode = "IFSC Code is required.";
  } else if (
    !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.ifscCode.trim())
  ) {
    errors.ifscCode = "Enter a valid IFSC code.";
  }

  // Privacy acknowledgement
  if (!form.privacyAccepted) {
    errors.privacyAccepted =
      "You must acknowledge the privacy notice before submitting.";
  }

  return errors;
}

export function toRegistrationFormData(
  form: RegistrationFormState,
  files: {
    panCard?: File | null;
    aadhaarCard?: File | null;
  },
): FormData {
  const formData = new FormData();

  formData.append("name", form.name.trim());
  formData.append("phone", form.phone.trim());
  formData.append("email", form.email.trim().toLowerCase());
  formData.append("password", form.password);

  formData.append("addressLine1", form.addressLine1.trim());
  formData.append("addressLine2", form.addressLine2.trim());
  formData.append("location", form.location.trim());
  formData.append("state", form.state.trim());
  formData.append("city", form.city.trim());
  formData.append("pinCode", form.pinCode.trim());

  formData.append(
    "panNumber",
    form.panNumber.trim().toUpperCase(),
  );
  formData.append("aadhaarNumber", form.aadhaarNumber.trim());

  formData.append("paymentUpi", form.paymentUpi.trim());
  formData.append("accountName", form.accountName.trim());
  formData.append("accountNumber", form.accountNumber.trim());
  formData.append("ifscCode", form.ifscCode.trim().toUpperCase());

  formData.append(
    "privacyAccepted",
    String(form.privacyAccepted),
  );

  if (files.panCard) {
    formData.append("panCard", files.panCard, files.panCard.name);
  }

  if (files.aadhaarCard) {
    formData.append(
      "aadhaarCard",
      files.aadhaarCard,
      files.aadhaarCard.name,
    );
  }

  return formData;
}