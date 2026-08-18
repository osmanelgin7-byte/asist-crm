"use client";

import { useState } from "react";
import { cn, formatCurrencyInput, parseCurrencyInput } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}

export function CurrencyInput({ label, className, id, value, onChange, placeholder, onBlur, ...props }: CurrencyInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");
  const [focused, setFocused] = useState(false);
  const displayValue = focused ? value : value ? formatCurrencyInput(parseCurrencyInput(value)) : "";

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder ?? "0"}
          className={cn(inputClass, "pr-9 tabular-nums", className)}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            const parsed = parseCurrencyInput(e.target.value);
            onChange(parsed > 0 ? formatCurrencyInput(parsed) : "");
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-400">₺</span>
      </div>
    </div>
  );
}
