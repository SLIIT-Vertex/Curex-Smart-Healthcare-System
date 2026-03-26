import { useCallback, type ChangeEvent } from "react";
import { Heart, Award, Upload, FileText, X, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setField } from "../../../store/slices/registerSlice";
import { useDocumentUpload } from "../../../hooks/useDocumentUpload";
import { Field } from "../Field";
import { NavButtons } from "./NavButtons";

/**
 * Step 3 — role-specific profile.
 * Patients fill in health details; doctors fill in qualifications.
 * Zero-param: reads and writes Redux.
 */
export const DetailsStep = () => {
  const dispatch = useAppDispatch();
  const form = useAppSelector((s) => s.register);
  const errors = form.errors;

  const sanitizePhoneInput = useCallback((value: string) => {
    const trimmed = value.trim();
    const hasLeadingPlus = trimmed.startsWith("+");
    const digitsOnly = value.replace(/\D/g, "");
    return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const key = e.target.dataset.field;
      if (!key) return;
      const rawValue = e.target.value;
      let value = rawValue;

      if (key === "yearsOfExperience") {
        value = rawValue.replace(/\D/g, "");
      }

      if (key === "emergencyContactPhone") {
        value = sanitizePhoneInput(rawValue);
      }

      dispatch(setField({ key: key as keyof typeof form, value }));
    },
    [dispatch, sanitizePhoneInput],
  );

  const toggleFillHealth = useCallback(() => {
    dispatch(setField({ key: "fillHealthNow", value: !form.fillHealthNow }));
  }, [dispatch, form.fillHealthNow]);

  const handleDocsChanged = useCallback(
    (urlsCsv: string) => {
      dispatch(setField({ key: "proofDocumentUrls", value: urlsCsv }));
    },
    [dispatch],
  );

  const {
    docs,
    fileInputRef,
    openPicker,
    handleFileChange,
    removeDoc,
    uploading,
    accept,
    maxFiles,
  } = useDocumentUpload(form.proofDocumentUrls, handleDocsChanged);

  if (form.role === "PATIENT") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Health profile
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Help us personalise your care. You can always update this later.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleFillHealth}
          className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
            form.fillHealthNow
              ? "border-primary-light bg-primary-light/6"
              : "border-text-secondary/15 bg-surface"
          }`}
          data-testid="register-fill-health-toggle"
        >
          <Heart
            className={`h-5 w-5 shrink-0 ${form.fillHealthNow ? "text-primary-light" : "text-text-secondary"}`}
            strokeWidth={1.5}
          />
          <div>
            <p
              className={`text-sm font-semibold ${form.fillHealthNow ? "text-primary" : "text-text-secondary"}`}
            >
              Fill in my health details now
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Recommended for a personalised experience
            </p>
          </div>
          <div
            className={`ml-auto h-5 w-9 rounded-full border-2 transition-colors relative shrink-0 ${form.fillHealthNow ? "border-primary-light bg-primary-light" : "border-text-secondary/30 bg-surface"}`}
          >
            <div
              className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-surface shadow transition-all ${form.fillHealthNow ? "left-3.5" : "left-0.5"}`}
            />
          </div>
        </button>

        {form.fillHealthNow && (
          <div className="auth-fade-in flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Blood group">
                <select
                  value={form.bloodGroup}
                  data-field="bloodGroup"
                  onChange={handleChange}
                  className="auth-input"
                  data-testid="register-blood-group-select"
                >
                  <option value="">Unknown</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (g) => (
                      <option key={g}>{g}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Known allergies">
                <input
                  type="text"
                  value={form.allergies}
                  data-field="allergies"
                  onChange={handleChange}
                  placeholder="e.g. Penicillin"
                  className="auth-input"
                  data-testid="register-allergies-input"
                />
              </Field>
            </div>
            <Field label="Chronic conditions">
              <input
                type="text"
                value={form.chronicConditions}
                data-field="chronicConditions"
                onChange={handleChange}
                placeholder="e.g. Diabetes, Hypertension"
                className="auth-input"
                data-testid="register-chronic-conditions-input"
              />
            </Field>
            <div className="rounded-xl bg-accent-sky/10 border border-accent-sky/25 px-4 py-3">
              <p className="text-xs font-semibold text-primary mb-2">
                Emergency contact
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={form.emergencyContactName}
                  data-field="emergencyContactName"
                  onChange={handleChange}
                  placeholder="Contact name"
                  className="auth-input text-xs py-2"
                  data-testid="register-emergency-name-input"
                />
                <div>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.emergencyContactPhone}
                    data-field="emergencyContactPhone"
                    onChange={handleChange}
                    placeholder="+94770000000"
                    className="auth-input text-xs py-2"
                    data-testid="register-emergency-phone-input"
                  />
                  {errors.emergencyContactPhone && (
                    <p className="mt-1 text-[11px] font-medium text-error">
                      {errors.emergencyContactPhone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <NavButtons />
      </div>
    );
  }

  // ── DOCTOR path ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Qualifications & credentials
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Reviewed by our admin team before you can see patients.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/12 px-4 py-3">
        <Award
          className="h-5 w-5 text-primary-light shrink-0"
          strokeWidth={1.5}
        />
        <p className="text-xs text-text-secondary leading-relaxed">
          Upload your documents carefully — they speed up verification.
        </p>
      </div>

      <Field label="Medical specialty">
        <input
          type="text"
          value={form.specialty}
          data-field="specialty"
          onChange={handleChange}
          placeholder="e.g. Cardiology, Paediatrics"
          className="auth-input"
          data-testid="register-specialty-input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Medical licence no.">
          <input
            type="text"
            value={form.medicalLicenseNumber}
            data-field="medicalLicenseNumber"
            onChange={handleChange}
            placeholder="MC-12345"
            className="auth-input"
            data-testid="register-license-input"
          />
        </Field>
        <Field label="Years of experience" error={errors.yearsOfExperience}>
          <input
            type="text"
            inputMode="numeric"
            min="0"
            max="60"
            value={form.yearsOfExperience}
            data-field="yearsOfExperience"
            onChange={handleChange}
            placeholder="e.g. 5"
            className="auth-input"
            data-testid="register-experience-input"
          />
        </Field>
      </div>

      <Field
        label={
          <>
            Certifications{" "}
            <span className="font-normal text-text-secondary">(optional)</span>
          </>
        }
      >
        <input
          type="text"
          value={form.certifications}
          data-field="certifications"
          onChange={handleChange}
          placeholder="e.g. FRCS, FCPS"
          className="auth-input"
          data-testid="register-certifications-input"
        />
      </Field>

      {/* ── Proof document upload (Cloudinary) ── */}
      <div>
        <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-1.5">
          <Upload className="h-4 w-4" strokeWidth={1.5} />
          Upload proof documents
          <span className="font-normal text-text-secondary text-xs">
            (optional)
          </span>
        </p>

        {/* Uploaded files list */}
        {docs.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {docs.map((doc, i) => (
              <div
                key={doc.url}
                className="flex items-center gap-3 rounded-lg border border-text-secondary/15 bg-surface px-3 py-2"
              >
                <FileText
                  className="h-4 w-4 shrink-0 text-primary-light"
                  strokeWidth={1.5}
                />
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate text-sm text-primary hover:text-primary-light transition-colors"
                  title={doc.name}
                >
                  {doc.name}
                </a>
                <button
                  type="button"
                  onClick={() => removeDoc(i)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary hover:bg-error/10 hover:text-error transition-colors"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input — driven by ref so display:none never blocks the picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleFileChange}
          data-testid="register-doc-upload-input"
        />

        {/* Drop zone — calls openPicker() via ref on click */}
        {docs.length < maxFiles && (
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-text-secondary/20 bg-surface px-4 py-8 text-center hover:border-primary-light/40 hover:bg-primary-light/[0.03] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid="register-doc-upload-button"
          >
            {uploading ? (
              <>
                <Loader2
                  className="h-8 w-8 text-primary-light animate-spin"
                  strokeWidth={1}
                />
                <p className="text-sm text-primary-light font-medium">
                  Uploading…
                </p>
              </>
            ) : (
              <>
                <Upload
                  className="h-8 w-8 text-text-secondary/40"
                  strokeWidth={1}
                />
                <p className="text-sm text-text-secondary">
                  Click to browse, or{" "}
                  <span className="text-primary-light font-medium">
                    choose files
                  </span>
                </p>
                <p className="text-xs text-text-secondary/60">
                  PDF, JPG, PNG — up to 5 MB each · {maxFiles - docs.length}{" "}
                  remaining
                </p>
              </>
            )}
          </button>
        )}
      </div>

      <NavButtons />
    </div>
  );
};
