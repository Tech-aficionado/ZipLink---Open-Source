"use client";

import { useMemo } from "react";
import {
  CampaignValidationError,
  previewCampaignUrl,
  type UtmKey,
  type UtmValues,
} from "@/lib/campaign";

interface CampaignFieldsProps {
  idPrefix: string;
  originalUrl: string;
  tagsText: string;
  onTagsChange: (value: string) => void;
  utm: UtmValues;
  onUtmChange: (value: UtmValues) => void;
}

const UTM_FIELDS: Array<{ key: UtmKey; label: string; required?: boolean }> = [
  { key: "source", label: "Source", required: true },
  { key: "medium", label: "Medium", required: true },
  { key: "campaign", label: "Campaign", required: true },
  { key: "term", label: "Term" },
  { key: "content", label: "Content" },
];

export const EMPTY_UTM: UtmValues = {
  source: "",
  medium: "",
  campaign: "",
  term: "",
  content: "",
};

export default function CampaignFields({
  idPrefix,
  originalUrl,
  tagsText,
  onTagsChange,
  utm,
  onUtmChange,
}: CampaignFieldsProps) {
  const preview = useMemo(() => {
    const destination = originalUrl.trim();
    if (!destination) return null;
    try {
      const usesBuilder = Object.values(utm).some((value) => Boolean(value.trim()));
      if (!usesBuilder) {
        const parsed = new URL(destination);
        if (
          (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
          parsed.username ||
          parsed.password ||
          destination.length > 2048 ||
          /[\u0000-\u001f\u007f]/.test(destination)
        ) {
          throw new CampaignValidationError("Enter a valid HTTP(S) destination without credentials.");
        }
        return { value: destination, error: null };
      }
      return { value: previewCampaignUrl(destination, utm), error: null };
    } catch (error) {
      return {
        value: null,
        error: error instanceof CampaignValidationError ? error.message : "Enter a valid destination to preview.",
      };
    }
  }, [originalUrl, utm]);


  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div>
        <label htmlFor={`${idPrefix}-tags`} className="text-xs font-medium text-muted-strong">
          Tags (optional)
        </label>
        <input
          id={`${idPrefix}-tags`}
          value={tagsText}
          onChange={(event) => onTagsChange(event.target.value)}
          placeholder="social, launch, summer"
          className="zip-field mt-1.5"
          maxLength={124}
        />
        <p className="mt-1 text-xs text-muted">Up to five comma-separated tags.</p>
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-muted-strong">UTM builder (optional)</legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {UTM_FIELDS.map(({ key, label, required }) => (
            <label key={key} className={key === "campaign" ? "sm:col-span-2" : ""}>
              <span className="text-xs text-muted-strong">
                {label}{required ? " *" : ""}
              </span>
              <input
                value={utm[key]}
                onChange={(event) => onUtmChange({ ...utm, [key]: event.target.value })}
                placeholder={key === "source" ? "newsletter" : key === "medium" ? "email" : ""}
                className="zip-field mt-1.5"
                maxLength={100}
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Source, medium, and campaign are required when UTM fields are used.</p>
      </fieldset>

      {preview ? (
        <div className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2 text-xs">
          <span className="font-medium text-muted-strong">Final destination preview</span>
          {preview.value ? (
            <p className="mt-1 break-all text-foreground">{preview.value}</p>
          ) : (
            <p className="mt-1 text-danger">{preview.error}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
