"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import type { LinkItem } from "@/lib/api";

interface QrModalProps {
  link: LinkItem;
  onClose: () => void;
}

/** Strip the protocol for a cleaner short-link display. */
function displayShort(shortUrl: string): string {
  return shortUrl.replace(/^https?:\/\//, "");
}

/**
 * Accessible modal that renders an on-brand QR code for a link's shortUrl,
 * with actions to download the QR as a PNG and copy the link.
 * Closes on overlay click and on Escape.
 */
export default function QrModal({ link, onClose }: QrModalProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    // Move focus to the close button when the modal opens.
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.clearTimeout(copyTimer.current);
    };
  }, [onClose]);

  const handleDownload = () => {
    try {
      const canvas = canvasWrapRef.current?.querySelector("canvas");
      if (!canvas) {
        toast.error("Couldn't find the QR code to download.");
        return;
      }
      // toDataURL can throw (e.g. a tainted canvas or out-of-memory).
      const dataUrl = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `ziplink-${link.shortCode}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      toast.error("Couldn't download the QR code. Try again.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className="border-gradient glass glow-ring animate-fade-up relative w-full max-w-sm rounded-[var(--radius-lg)] p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close QR code"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <h2 id="qr-modal-title" className="text-base font-semibold text-foreground">
          QR code
        </h2>
        <p className="mt-0.5 truncate font-mono text-xs text-muted" title={link.shortUrl}>
          {displayShort(link.shortUrl)}
        </p>

        <div className="mt-5 flex justify-center">
          <div
            ref={canvasWrapRef}
            className="rounded-[var(--radius)] bg-white p-4 shadow-[var(--shadow-md)]"
          >
            <QRCodeCanvas
              value={link.shortUrl}
              size={200}
              level="M"
              marginSize={2}
              fgColor="#101014"
              bgColor="#ffffff"
              title={`QR code for ${link.shortUrl}`}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" size="md" onClick={handleDownload} className="flex-1">
            Download PNG
          </Button>
          <Button variant="secondary" size="md" onClick={handleCopy} className="flex-1">
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
