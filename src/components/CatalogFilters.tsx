import { useState } from "react";
import { Check } from "lucide-react";
import type { CatalogFacets, NftSearch, NftSort } from "@/types";
import {
  additionalCollectionOptions,
  collectionOptions,
  networkOptions,
} from "@/services/catalog-options";
import { decimalPattern } from "@/services/search";
import { fromWei, toWei } from "@/services/money";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Field } from "./Feedback";

type ChangeSearch = (
  patch: Partial<NftSearch> | ((current: NftSearch) => Partial<NftSearch>),
) => void;
const tickWei = 10n ** 16n;
const maxTick = 1600;

// Slider coordinates are integer hundredths; prices remain exact decimal strings.
function priceTick(price: string, fallback: number) {
  if (!decimalPattern.test(price)) return fallback;
  const tick = toWei(price) / tickWei;
  return Number(tick > BigInt(maxTick) ? BigInt(maxTick) : tick);
}
function displayPrice(price: string) {
  if (!price) return "--";
  const [whole, fraction = ""] = price.split(".");
  return `${whole},${fraction.padEnd(2, "0")}`;
}

function PriceFilter({
  search,
  ready,
  change,
}: {
  search: NftSearch;
  ready: boolean;
  change: ChangeSearch;
}) {
  const [min, setMin] = useState(search.minPrice ?? "0");
  const [max, setMax] = useState(search.maxPrice ?? "12.30");
  const [error, setError] = useState("");
  const ticks = [priceTick(min, 0), priceTick(max, 1230)].sort((a, b) => a - b);
  return (
    <form
      className="price-filter"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          (min && !decimalPattern.test(min)) ||
          (max && !decimalPattern.test(max))
        ) {
          setError("Use valores decimais com ate 18 casas.");
          return;
        }
        if (min && max && toWei(min) > toWei(max)) {
          setError("O minimo deve ser menor que o maximo.");
          return;
        }
        setError("");
        change({ minPrice: min || undefined, maxPrice: max || undefined });
      }}
    >
      <h2>Faixa de preço</h2>
      <Slider
        className="price-slider"
        disabled={!ready}
        min={0}
        max={maxTick}
        step={1}
        value={ticks}
        minStepsBetweenThumbs={0}
        thumbLabels={["Preco minimo", "Preco maximo"]}
        thumbValueText={[`${min || "0"} ETH`, `${max || "16"} ETH`]}
        onValueChange={([low, high]) => {
          setMin(fromWei(BigInt(low) * tickWei));
          setMax(fromWei(BigInt(high) * tickWei));
          setError("");
        }}
      />
      <p className="price-caption">
        Preço: {displayPrice(min)} - {displayPrice(max)} ETH
      </p>
      <Button type="submit" disabled={!ready}>
        Aplicar
      </Button>
      <details className="exact-prices">
        <summary>Valores exatos</summary>
        <Field
          label="Minimo (ETH)"
          name="minPrice"
          disabled={!ready}
          inputMode="decimal"
          value={min}
          onChange={(event) => setMin(event.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "price-error" : undefined}
        />
        <Field
          label="Maximo (ETH)"
          name="maxPrice"
          disabled={!ready}
          inputMode="decimal"
          value={max}
          onChange={(event) => setMax(event.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "price-error" : undefined}
        />
      </details>
      {error && (
        <p id="price-error" role="alert" className="field-error">
          {error}
        </p>
      )}
    </form>
  );
}

function FacetRow({
  label,
  count,
  checked,
  ready,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  ready: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`facet-row ${checked ? "facet-selected" : ""}`}>
      <input
        className="facet-input"
        type="checkbox"
        aria-label={label}
        disabled={!ready}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="facet-label">
        {checked && <Check size={14} aria-hidden="true" />}
        {label}
      </span>
      {count === undefined ? (
        <span className="facet-count shimmer" aria-hidden="true" />
      ) : (
        <span className="facet-count">({count})</span>
      )}
    </label>
  );
}

export function CatalogFilters({
  search,
  facets,
  ready,
  change,
}: {
  search: NftSearch;
  facets?: CatalogFacets;
  ready: boolean;
  change: ChangeSearch;
}) {
  const categoryRow = ({ id, label }: { id: string; label: string }) => (
    <FacetRow
      key={id}
      label={label}
      count={facets?.categories[id]}
      checked={search.categories.includes(id)}
      ready={ready}
      onChange={(checked) =>
        change((current) => ({
          categories: checked
            ? [...new Set([...current.categories, id])]
            : current.categories.filter((value) => value !== id),
        }))
      }
    />
  );
  return (
    <aside className="catalog-filters" aria-label="Filtros do catalogo">
      <label className="mobile-sort">
        Ordenar
        <select
          aria-label="Ordenar"
          value={search.sort}
          disabled={!ready}
          onChange={(event) => change({ sort: event.target.value as NftSort })}
        >
          <option value="recent">Listados recentemente</option>
          <option value="price-asc">Menor preco</option>
          <option value="price-desc">Maior preco</option>
          <option value="title">Nome</option>
        </select>
      </label>
      <fieldset className="catalog-facet-group">
        <legend>Coleções</legend>
        {collectionOptions.map(categoryRow)}
      </fieldset>
      <PriceFilter
        key={`${search.minPrice}:${search.maxPrice}`}
        search={search}
        ready={ready}
        change={change}
      />
      <fieldset className="catalog-facet-group">
        <legend>Rede</legend>
        {networkOptions.map(({ id, label }) => (
          <FacetRow
            key={id}
            label={label}
            count={facets?.networks[id]}
            checked={search.networks.includes(id)}
            ready={ready}
            onChange={(checked) =>
              change((current) => ({
                networks: checked
                  ? [...new Set([...current.networks, id])]
                  : current.networks.filter((value) => value !== id),
              }))
            }
          />
        ))}
      </fieldset>
      <details
        className="extra-filters"
        open={
          search.categories.some((id) =>
            additionalCollectionOptions.some((option) => option.id === id),
          ) || search.available
            ? true
            : undefined
        }
      >
        <summary>Mais filtros</summary>
        {additionalCollectionOptions.map(categoryRow)}
        <label className="check-row">
          <input
            type="checkbox"
            disabled={!ready}
            checked={!!search.available}
            onChange={(event) =>
              change({ available: event.target.checked || undefined })
            }
          />
          Somente disponiveis
        </label>
      </details>
      <Button
        variant="ghost"
        className="clear-filters"
        disabled={!ready}
        onClick={() =>
          change({
            q: "",
            categories: [],
            networks: [],
            minPrice: undefined,
            maxPrice: undefined,
            available: undefined,
            sort: "recent",
          })
        }
      >
        Limpar filtros
      </Button>
    </aside>
  );
}
