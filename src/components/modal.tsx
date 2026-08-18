"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "md" | "lg";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-10 flex max-h-[min(92dvh,920px)] w-full flex-col rounded-3xl border border-zinc-200/80 bg-white shadow-2xl shadow-indigo-500/10 ${
          size === "lg" ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-3.5">
          <h2 id="modal-title" className="text-base font-bold text-zinc-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
