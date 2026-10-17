import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import { registerUser } from "../api/auth.api";
import {
  EMPTY_REGISTRATION_FORM,
  formatFileSize,
  maskValue,
  toRegistrationFormData,
  validateRegistrationForm,
  type RegistrationErrors,
  type RegistrationFormState,
} from "../schemas/registration.schema";
import "../styles/auth.css";

import { State, City } from "country-state-city";
import Select from "react-select";

const initialFiles = {
  panCard: null as File | null,
  aadhaarCard: null as File | null,
};

type SectionKey = "personal" | "kyc" | "bank" | "terms";
const indianStates = State.getStatesOfCountry("IN");


function RegisterPage() {
  const [form, setForm] = useState<RegistrationFormState>(
    EMPTY_REGISTRATION_FORM,
  );
  const [files, setFiles] = useState(initialFiles);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showIfscCode, setShowIfscCode] = useState(false);

  const [success, setSuccess] = useState<{
    reference: string;
    message: string;
  } | null>(null);

  const [openSections, setOpenSections] = useState<
    Record<SectionKey, boolean>
  >({
    personal: true,
    kyc: true,
    bank: true,
    terms: true,
  });
  const selectedState = indianStates.find(
    (state) => state.name === form.state,
  );

  const indianCities = selectedState
    ? City.getCitiesOfState("IN", selectedState.isoCode)
    : [];

  const statusSummary = useMemo(
    () => ({
      pan: files.panCard
        ? `${files.panCard.name} · ${formatFileSize(files.panCard.size)}`
        : "Not selected",
      aadhaar: files.aadhaarCard
        ? `${files.aadhaarCard.name} · ${formatFileSize(files.aadhaarCard.size)}`
        : "Not selected",
    }),
    [files.panCard, files.aadhaarCard],
  );

  function updateField<K extends keyof RegistrationFormState>(
    field: K,
    value: RegistrationFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setSubmitError(null);
  }

  function toggleSection(key: SectionKey) {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    field: "panCard" | "aadhaarCard",
  ) {
    const selectedFile = event.target.files?.[0] ?? null;

    setFiles((current) => ({
      ...current,
      [field]: selectedFile,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setSubmitError(null);
  }

  function clearFile(field: "panCard" | "aadhaarCard") {
    setFiles((current) => ({
      ...current,
      [field]: null,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setSubmitError(null);
  }

  function validateAndSubmit(): boolean {
    const validationErrors = validateRegistrationForm(form, files);

    setErrors(validationErrors);

    const errorFields = Object.keys(validationErrors);

    if (errorFields.length > 0) {
      setOpenSections((current) => ({
        ...current,

        personal:
          current.personal ||
          errorFields.some((field) =>
            [
              "name",
              "phone",
              "email",
              "password",
              "addressLine1",
              "addressLine2",
              "location",
              "state",
              "city",
              "pinCode",
            ].includes(field),
          ),

        kyc:
          current.kyc ||
          errorFields.some((field) =>
            [
              "panNumber",
              "panCard",
              "aadhaarNumber",
              "aadhaarCard",
            ].includes(field),
          ),

        bank:
          current.bank ||
          errorFields.some((field) =>
            [
              "paymentUpi",
              "accountName",
              "accountNumber",
              "ifscCode",
            ].includes(field),
          ),

        terms:
          current.terms ||
          errorFields.includes("privacyAccepted"),
      }));

      // Log field names only. Do not log passwords, KYC data,
      // bank details, or uploaded document contents.
      console.log("Registration validation errors:", errorFields);

      return false;
    }

    return true;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!validateAndSubmit()) {
      setSubmitError(
        "Please fix the highlighted fields before submitting your application.",
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = toRegistrationFormData(form, files);
      const result = await registerUser(formData);

      const reference =
        result.reference ?? result.message ?? "APPLICATION-REF";

      setSuccess({
        reference,
        message:
          "Your registration has been submitted successfully. Your account is pending admin review. You will be able to log in after your application is approved and your account is activated.",
      });

      setForm({ ...EMPTY_REGISTRATION_FORM });
      setFiles({ ...initialFiles });
      setErrors({});
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Your registration could not be completed. Please try again.";

      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="auth-page">
        <section className="auth-panel auth-panel--narrow">
          <div className="auth-branding">
            <div className="auth-logo">R</div>
            <div>
              <p className="auth-kicker">Rockstar CRM</p>
              <h1>Registration submitted</h1>
            </div>
          </div>

          <div className="auth-copy">
            <p className="registration-reference">
              Application reference: {success.reference}
            </p>
            <p>{success.message}</p>
          </div>

          <div className="auth-actions auth-actions--stacked">
            <Link
              to="/login"
              className="auth-submit auth-submit--secondary"
            >
              Back to login
            </Link>

            <Link
              to="/registration-status"
              className="auth-submit auth-submit--secondary"
            >
              Check status
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page auth-page--wide">
      <section className="auth-panel auth-panel--wide">
        <div className="auth-branding">
          <div className="auth-logo">R</div>
          <div>
            <p className="auth-kicker">Rockstar CRM</p>
            <h1>Create your account</h1>
          </div>
        </div>

        <div className="auth-copy">
          <h2>Register</h2>
          <p>
            Complete your profile and submit the required KYC,
            banking, and verification details.
          </p>
        </div>

        <form
          className="auth-form auth-form--split"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* Section A: Personal Information */}
          <section className="registration-section">
            <button
              type="button"
              className="section-toggle"
              onClick={() => toggleSection("personal")}
              aria-expanded={openSections.personal}
            >
              Section A: Personal Information
            </button>

            {openSections.personal && (
              <div className="section-content">
                <div className="form-grid">
                  <div className="field-group">
                    <label htmlFor="name">Name *</label>
                    <input
                      id="name"
                      name="name"
                      autoComplete="name"
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                    />
                    {errors.name && (
                      <span className="field-error">
                        {errors.name}
                      </span>
                    )}
                  </div>

                  <div className="field-group">
                    <label htmlFor="phone">Phone *</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                    />
                    {errors.phone && (
                      <span className="field-error">
                        {errors.phone}
                      </span>
                    )}
                  </div>

                  <div className="field-group field-group--full">
                    <label htmlFor="email">Email ID *</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                    />
                    {errors.email && (
                      <span className="field-error">
                        {errors.email}
                      </span>
                    )}
                  </div>

                  <div className="field-group field-group--full">
                    <label htmlFor="password">Password *</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(event) =>
                        updateField("password", event.target.value)
                      }
                      minLength={8}
                      maxLength={128}
                      required
                    />
                    <small>
                      Use at least 8 characters.
                    </small>
                    {errors.password && (
                      <span className="field-error">
                        {errors.password}
                      </span>
                    )}
                  </div>

                  <div className="field-group field-group--full">
                    <label htmlFor="addressLine1">
                      Address / Line-1 *
                    </label>
                    <input
                      id="addressLine1"
                      name="addressLine1"
                      autoComplete="address-line1"
                      value={form.addressLine1}
                      onChange={(event) =>
                        updateField("addressLine1", event.target.value)
                      }
                    />
                    {errors.addressLine1 && (
                      <span className="field-error">
                        {errors.addressLine1}
                      </span>
                    )}
                  </div>

                  <div className="field-group field-group--full">
                    <label htmlFor="addressLine2">
                      Address / Line-2
                    </label>
                    <input
                      id="addressLine2"
                      name="addressLine2"
                      autoComplete="address-line2"
                      value={form.addressLine2}
                      onChange={(event) =>
                        updateField("addressLine2", event.target.value)
                      }
                    />
                    {errors.addressLine2 && (
                      <span className="field-error">
                        {errors.addressLine2}
                      </span>
                    )}
                  </div>

                  <div className="field-group">
                    <label htmlFor="location">Location *</label>
                    <input
                      id="location"
                      name="location"
                      value={form.location}
                      onChange={(event) =>
                        updateField("location", event.target.value)
                      }
                    />
                    {errors.location && (
                      <span className="field-error">
                        {errors.location}
                      </span>
                    )}
                  </div>
                  <div className="field-group ">
                   <label htmlFor="state">state *</label>
                  <Select
                    inputId="state"
                    className="state-dropdown"
                    name="state"
                    options={indianStates.map((state) => ({
                      value: state.name,
                      label: state.name,
                    }))}
                    value={
                      indianStates
                        .filter((state) => state.name === form.state)
                        .map((state) => ({
                          value: state.name,
                          label: state.name,
                        }))[0] ?? null
                    }
                    onChange={(option) => {
                      updateField("state", option?.value ?? "");
                      updateField("city", "");
                    }}
                    placeholder="Type to search state..."
                    isSearchable
                    isClearable
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={{
                      menuPortal: (base) => ({
                        ...base,
                        zIndex: 99999,
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 99999,
                      }),
                    }}
                    noOptionsMessage={() => "No state found"}
                  />
                  </div>

                  <div className="field-group ">
                    <label htmlFor="city">City *</label>

                    <Select
                      inputId="city"
                      name="city"
                      className="city-dropdown"
                      options={indianCities.map((city) => ({
                        value: city.name,
                        label: city.name,
                      }))}
                      value={
                        indianCities
                          .filter((city) => city.name === form.city)
                          .map((city) => ({
                            value: city.name,
                            label: city.name,
                          }))[0] ?? null
                      }
                      onChange={(option) => {
                        updateField("city", option?.value ?? "");
                      }}
                      placeholder={
                        form.state ? "Type to search city..." : "Select state first"
                      }
                      isSearchable
                      isClearable
                      isDisabled={!form.state}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{
                        menuPortal: (base) => ({
                          ...base,
                          zIndex: 99999,
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 99999,
                        }),
                      }}
                      noOptionsMessage={() => "No city found"}
                    />

                    {errors.city && (
                      <span className="field-error">{errors.city}</span>
                    )}
                  </div>

                  <div className="field-group">
                    <label htmlFor="pinCode">Pin Code *</label>
                    <input
                      id="pinCode"
                      name="pinCode"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={6}
                      value={form.pinCode}
                      onChange={(event) =>
                        updateField(
                          "pinCode",
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                    />
                    {errors.pinCode && (
                      <span className="field-error">
                        {errors.pinCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Section B: KYC Information */}
          <section className="registration-section">
            <button
              type="button"
              className="section-toggle"
              onClick={() => toggleSection("kyc")}
              aria-expanded={openSections.kyc}
            >
              Section B: KYC Information
            </button>

            {openSections.kyc && (
              <div className="section-content">
                <div className="form-grid">
                  <div className="field-group">
                    <label htmlFor="panNumber">PAN Number *</label>
                    <input
                      id="panNumber"
                      name="panNumber"
                      autoCapitalize="characters"
                      maxLength={10}
                      value={form.panNumber}
                      onChange={(event) =>
                        updateField(
                          "panNumber",
                          event.target.value.toUpperCase(),
                        )
                      }
                    />
                    {errors.panNumber && (
                      <span className="field-error">
                        {errors.panNumber}
                      </span>
                    )}
                    {form.panNumber && (
                      <small className="masked-preview">
                        Masked: {maskValue(form.panNumber, 4)}
                      </small>
                    )}
                  </div>

                  <div className="field-group">
                    <label htmlFor="panCard">PAN Card *</label>
                    <input
                      id="panCard"
                      name="panCard"
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={(event) =>
                        handleFileChange(event, "panCard")
                      }
                    />

                    {files.panCard && (
                      <div className="file-meta">
                        <span>{files.panCard.name}</span>
                        <span>
                          {formatFileSize(files.panCard.size)}
                        </span>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => clearFile("panCard")}
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {errors.panCard && (
                      <span className="field-error">
                        {errors.panCard}
                      </span>
                    )}
                  </div>

                  <div className="field-group">
                    <label htmlFor="aadhaarNumber">
                      Aadhaar Number *
                    </label>
                    <input
                      id="aadhaarNumber"
                      name="aadhaarNumber"
                      inputMode="numeric"
                      maxLength={12}
                      value={form.aadhaarNumber}
                      onChange={(event) =>
                        updateField(
                          "aadhaarNumber",
                          event.target.value.replace(/\D/g, "").slice(0, 12),
                        )
                      }
                    />
                    {errors.aadhaarNumber && (
                      <span className="field-error">
                        {errors.aadhaarNumber}
                      </span>
                    )}
                    {form.aadhaarNumber && (
                      <small className="masked-preview">
                        Masked: {maskValue(form.aadhaarNumber, 4)}
                      </small>
                    )}
                  </div>

                  <div className="field-group">
                    <label htmlFor="aadhaarCard">
                      Aadhaar Card *
                    </label>
                    <input
                      id="aadhaarCard"
                      name="aadhaarCard"
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={(event) =>
                        handleFileChange(event, "aadhaarCard")
                      }
                    />

                    {files.aadhaarCard && (
                      <div className="file-meta">
                        <span>{files.aadhaarCard.name}</span>
                        <span>
                          {formatFileSize(files.aadhaarCard.size)}
                        </span>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => clearFile("aadhaarCard")}
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {errors.aadhaarCard && (
                      <span className="field-error">
                        {errors.aadhaarCard}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Section C: Bank and Payment Details */}
          <section className="registration-section">
            <button
              type="button"
              className="section-toggle"
              onClick={() => toggleSection("bank")}
              aria-expanded={openSections.bank}
            >
              Section C: Bank Account and Payment Details
            </button>

            {openSections.bank && (
              <div className="section-content">
                <div className="form-grid">
                  <div className="field-group field-group--full">
                    <label htmlFor="paymentUpi">
                      Payment UPI ID *
                    </label>
                    <input
                      id="paymentUpi"
                      name="paymentUpi"
                      value={form.paymentUpi}
                      onChange={(event) =>
                        updateField("paymentUpi", event.target.value)
                      }
                    />
                    {errors.paymentUpi && (
                      <span className="field-error">
                        {errors.paymentUpi}
                      </span>
                    )}
                  </div>

                  <div className="field-group">
                    <label htmlFor="accountName">
                      Account Name *
                    </label>
                    <input
                      id="accountName"
                      name="accountName"
                      autoComplete="off"
                      value={form.accountName}
                      onChange={(event) =>
                        updateField("accountName", event.target.value)
                      }
                    />
                    {errors.accountName && (
                      <span className="field-error">
                        {errors.accountName}
                      </span>
                    )}
                  </div>

                  <div className="field-group">
                    <label htmlFor="accountNumber">
                      Account Number *
                    </label>
                    <div className="password-input">
                      <input
                        id="accountNumber"
                        name="accountNumber"
                        type={showAccountNumber ? "text" : "password"}
                        autoComplete="off"
                        value={form.accountNumber}
                        onChange={(event) =>
                          updateField("accountNumber", event.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() =>
                          setShowAccountNumber((value) => !value)
                        }
                      >
                        {showAccountNumber ? "Hide" : "Show"}
                      </button>
                    </div>
                    {errors.accountNumber && (
                      <span className="field-error">
                        {errors.accountNumber}
                      </span>
                    )}
                    {form.accountNumber && (
                      <small className="masked-preview">
                        Masked: {maskValue(form.accountNumber, 4)}
                      </small>
                    )}
                  </div>

                  <div className="field-group">
                    <label htmlFor="ifscCode">IFSC Code *</label>
                    <div className="password-input">
                      <input
                        id="ifscCode"
                        name="ifscCode"
                        type={showIfscCode ? "text" : "password"}
                        autoComplete="off"
                        maxLength={11}
                        value={form.ifscCode}
                        onChange={(event) =>
                          updateField(
                            "ifscCode",
                            event.target.value.toUpperCase(),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() =>
                          setShowIfscCode((value) => !value)
                        }
                      >
                        {showIfscCode ? "Hide" : "Show"}
                      </button>
                    </div>
                    {errors.ifscCode && (
                      <span className="field-error">
                        {errors.ifscCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Section D: Terms and Submission */}
          <section className="registration-section">
            <button
              type="button"
              className="section-toggle"
              onClick={() => toggleSection("terms")}
              aria-expanded={openSections.terms}
            >
              Section D: Terms and Submission
            </button>

            {openSections.terms && (
              <div className="section-content">
                <div className="privacy-notice">
                  <h3>Privacy notice</h3>
                  <p>
                    We collect personal, KYC, and banking details
                    strictly to verify identity, support onboarding,
                    prevent fraud, comply with regulatory requirements,
                    and manage payments and account activation for
                    Rockstar CRM services.
                  </p>
                </div>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    name="privacyAccepted"
                    checked={form.privacyAccepted}
                    onChange={(event) =>
                      updateField(
                        "privacyAccepted",
                        event.target.checked,
                      )
                    }
                  />
                  <span>
                    I acknowledge the privacy notice and agree that
                    the information is required for account
                    registration and review.
                  </span>
                </label>

                {errors.privacyAccepted && (
                  <span className="field-error">
                    {errors.privacyAccepted}
                  </span>
                )}

                <div className="registration-summary">
                  <p>Document summary</p>
                  <ul>
                    <li>PAN: {statusSummary.pan}</li>
                    <li>Aadhaar: {statusSummary.aadhaar}</li>
                  </ul>
                </div>

                {submitError && (
                  <div className="auth-error" role="alert">
                    {submitError}
                  </div>
                )}

                <div className="auth-actions auth-actions--stacked">
                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : "Submit Registration"}
                  </button>

                  <Link
                    to="/login"
                    className="auth-submit auth-submit--secondary"
                  >
                    Back to Login
                  </Link>
                </div>
              </div>
            )}
          </section>
        </form>
      </section>
    </main>
  );
}

export default RegisterPage;