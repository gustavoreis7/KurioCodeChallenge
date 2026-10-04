import type { InputHTMLAttributes } from "react";
import { errorMessage, fieldErrors } from "@/services/http";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function Field({
  label,
  name,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
}) {
  return (
    <div className="form-field">
      <Label htmlFor={name}>
        {label}
        {props.required && (
          <span aria-hidden="true" className="text-primary">
            {" "}
            *
          </span>
        )}
      </Label>
      <Input
        id={name}
        name={name}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${name}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  if (!error) return null;
  return (
    <div className="notice error-notice" role="alert">
      <p>{errorMessage(error)}</p>
      {Object.entries(fieldErrors(error)).map(([key, message]) => (
        <p key={key}>{message}</p>
      ))}
      {retry && (
        <Button variant="outline" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
export function ContentSkeleton({
  detail = false,
  count = 9,
}: {
  detail?: boolean;
  count?: number;
}) {
  if (detail)
    return (
      <>
        <div className="breadcrumb" aria-hidden="true">
          <div className="shimmer h-[15px] w-48" />
        </div>
        <div
          className="detail-layout"
          aria-busy="true"
          aria-label="Carregando NFT"
        >
          <div className="detail-gallery">
            <div className="gallery-thumbnails">
              <div className="shimmer aspect-square" />
            </div>
            <div className="detail-image shimmer" />
          </div>
          <div className="detail-info">
            <div className="shimmer h-7 w-3/4 mb-3" />
            <div className="shimmer h-6 w-1/3 mb-6" />
            <div className="shimmer h-20 mb-5" />
            <div className="shimmer h-12 mb-5" />
            <div className="shimmer h-10 mb-5" />
            <div className="shimmer h-20" />
          </div>
        </div>
        <section className="detail-tabs" aria-hidden="true">
          <div className="h-10 border-b border-border">
            <div className="shimmer h-4 w-48" />
          </div>
          <div className="min-h-[180px] pt-4">
            <div className="shimmer h-4 w-3/4" />
          </div>
        </section>
        <section className="related-section" aria-busy="true">
          <h2>Mais desta colecao</h2>
          <ContentSkeleton count={5} />
        </section>
      </>
    );
  return (
    <div className="catalog-grid" aria-busy="true" aria-label="Carregando NFTs">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="nft-card">
          <div className="nft-image shimmer" />
          <div className="nft-card-info">
            <div className="shimmer h-4 w-3/4" />
            <div className="shimmer mt-2 h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
export function SummarySkeleton({ itemCount = 0 }: { itemCount?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando resumo"
      className="summary-skeleton"
    >
      {Array.from({ length: itemCount }, (_, i) => (
        <div key={`item-${i}`} className="receipt-skeleton-item">
          <div className="shimmer size-12" />
          <div className="shimmer h-4 w-full" />
        </div>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="shimmer h-5 my-4" />
      ))}
    </div>
  );
}
