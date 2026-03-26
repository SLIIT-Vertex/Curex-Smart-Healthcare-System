import { useCallback, type ChangeEvent } from "react";
import { Phone, Mail } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setField } from "../../../store/slices/registerSlice";
import { Field } from "../Field";
import { NavButtons } from "./NavButtons";

/** Step 4 — phone (required) and email (required). Zero-param: reads and writes Redux. */
export const ContactStep = () => {
  const dispatch = useAppDispatch();
  const form = useAppSelector((s) => s.register);
  const errors = form.errors;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const key = e.target.dataset.field;
      if (!key) return;
      dispatch(
        setField({ key: key as keyof typeof form, value: e.target.value }),
      );
    },
    [dispatch],
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Contact information
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Both phone and email are required and will be verified via OTP.
        </p>
      </div>

      <Field
        label={
          <>
            <Phone className="h-3.5 w-3.5 inline mr-1.5" />
            Phone number
          </>
        }
        error={errors.phone}
      >
        <input
          type="tel"
          autoComplete="tel"
          value={form.phone}
          data-field="phone"
          onChange={handleChange}
          placeholder="+94 77 000 0000"
          className="auth-input"
          data-testid="register-phone-input"
        />
        <p className="text-xs text-text-secondary">
          Required — used for SMS OTP verification
        </p>
      </Field>

      <Field
        label={
          <>
            <Mail className="h-3.5 w-3.5 inline mr-1.5" />
            Email address
          </>
        }
        error={errors.email}
      >
        <input
          type="email"
          autoComplete="email"
          value={form.email}
          data-field="email"
          onChange={handleChange}
          placeholder="you@example.com"
          className="auth-input"
          data-testid="register-email-input"
        />
        <p className="text-xs text-text-secondary">
          Required — used for email OTP verification
        </p>
      </Field>

      <NavButtons />
    </div>
  );
};
