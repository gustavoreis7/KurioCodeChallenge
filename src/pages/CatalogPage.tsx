import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useNfts } from "@/hooks/useMarketplace";
import type { NftSearch, NftSort } from "@/types";
import { Button } from "@/components/ui/button";
import { Failure, ContentSkeleton } from "@/components/Feedback";
import { CatalogFilters } from "@/components/CatalogFilters";
import { NftGrid } from "@/components/NftGrid";
import { CatalogFeatures } from "@/components/CatalogFeatures";
import { catalogSearch } from "@/services/search";
import { useSession } from "@/services/session";
import { useMarketplace } from "@/components/MarketplaceProvider";
export function CatalogPage({ search }: { search: NftSearch }) {
  const navigate = useNavigate(),
    query = useNfts(search);
  const highlights = useNfts({ ...catalogSearch({}), pageSize: 4 });
  const { ready } = useSession();
  const { filtersOpen, searchOpen } = useMarketplace();
  const [heroIndex, setHeroIndex] = useState(0);
  const change = (
    patch: Partial<NftSearch> | ((current: NftSearch) => Partial<NftSearch>),
  ) =>
    void navigate({
      to: "/",
      search: (previous) => {
        const current = catalogSearch(previous);
        return {
          ...current,
          page: 1,
          ...(typeof patch === "function" ? patch(current) : patch),
        };
      },
      hash: "catalogo",
    });
  const hero = highlights.data?.items[heroIndex] ?? highlights.data?.items[0];
  const spotlight = highlights.data?.items[1] ?? hero;
  return (
    <>
      <section className="catalog-hero" aria-labelledby="catalog-title">
        <div>
          <p>Bem-vindo a Kurio</p>
          <h1 id="catalog-title">
            <span className="hero-desktop-title">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </span>
            <span className="hero-mobile-title">
              SEJA DONO DA
              <br />
              CULTURA DIGITAL
            </span>
          </h1>
          <p>
            <span className="hero-desktop-copy">
              Descubra NFTs selecionados de criadores emergentes e consagrados.
              Colecione arte digital rara, apoie artistas e tenha uma parte da
              cultura da internet.
            </span>
            <span className="hero-mobile-copy">
              Descubra NFTs selecionados de criadores do mundo todo.
            </span>
          </p>
          <a href="#catalogo" className="primary-link">
            Explorar
          </a>
        </div>
        {hero ? (
          <img
            className="hero-artwork"
            src={hero.imageUrl}
            alt={hero.imageAlt}
            width={320}
            height={320}
            fetchPriority="high"
          />
        ) : (
          <div
            className={`${highlights.isPending ? "shimmer" : "bg-card"} hero-image`}
          />
        )}
        {spotlight && (
          <img
            className="hero-thumbnail"
            src={spotlight.imageUrl}
            alt={spotlight.imageAlt}
            width={56}
            height={56}
          />
        )}
        <div className="hero-pagination" aria-label="Destaques">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              aria-label={`Mostrar destaque ${index + 1}`}
              aria-pressed={heroIndex === index}
              disabled={!highlights.data?.items[index]}
              onClick={() => setHeroIndex(index)}
            />
          ))}
        </div>
      </section>
      <section
        id="catalogo"
        className="catalog-layout"
        aria-label="Mercado de NFTs"
      >
        <div className={`catalog-sidebar ${filtersOpen ? "sidebar-open" : ""}`}>
          <CatalogFilters
            search={search}
            facets={query.data?.facets ?? highlights.data?.facets}
            ready={ready}
            change={change}
          />
          <section
            className="catalog-spotlight"
            aria-labelledby="spotlight-title"
          >
            <h2 id="spotlight-title">NFT EM DESTAQUE</h2>
            <p>EDICAO LIMITADA</p>
            {spotlight ? (
              <Link
                to="/nfts/$nftId"
                params={{ nftId: spotlight.id }}
                aria-label={`Ver destaque ${spotlight.title}`}
              >
                <img
                  src={spotlight.imageUrl}
                  alt={spotlight.imageAlt}
                  width={768}
                  height={768}
                  loading="lazy"
                />
                <span>{spotlight.title}</span>
                <span className="eth-value">{spotlight.priceEth} ETH</span>
              </Link>
            ) : (
              <div
                className={`spotlight-image ${highlights.isPending ? "shimmer" : ""}`}
                aria-hidden="true"
              />
            )}
          </section>
        </div>
        <div className="catalog-results">
          <div className="catalog-toolbar">
            <nav className="catalog-feed" aria-label="Selecao do catalogo">
              {[
                { id: "", label: "Todos os NFTs" },
                { id: "new", label: "Novos lançamentos" },
                { id: "trending", label: "Em alta" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  aria-pressed={
                    id
                      ? search.categories.includes(id)
                      : !search.categories.some((value) =>
                          ["new", "trending"].includes(value),
                        )
                  }
                  onClick={() =>
                    change((current) => ({
                      categories: [
                        ...current.categories.filter(
                          (value) => !["new", "trending"].includes(value),
                        ),
                        ...(id ? [id] : []),
                      ],
                    }))
                  }
                >
                  {label}
                </button>
              ))}
            </nav>
            <form
              key={search.q}
              className={`search-form ${searchOpen || search.q ? "search-open" : ""}`}
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                change({
                  q: String(new FormData(event.currentTarget).get("q") ?? ""),
                });
              }}
            >
              <label htmlFor="catalog-search" className="sr-only">
                Buscar NFTs
              </label>
              <input
                id="catalog-search"
                name="q"
                defaultValue={search.q}
                placeholder="Buscar NFT"
                type="search"
                disabled={!ready}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Buscar"
                disabled={!ready}
              >
                <Search size={16} />
              </Button>
            </form>
            <label className="sort-label">
              Ordenar
              <select
                aria-label="Ordenar"
                disabled={!ready}
                value={search.sort}
                onChange={(event) =>
                  change({ sort: event.target.value as NftSort })
                }
              >
                <option value="recent">Listados recentemente</option>
                <option value="price-asc">Menor preco</option>
                <option value="price-desc">Maior preco</option>
                <option value="title">Nome</option>
              </select>
            </label>
          </div>
          {query.isFetching && query.data && (
            <p className="subtle-status" role="status">
              Atualizando catalogo…
            </p>
          )}
          {query.isPending ? (
            <ContentSkeleton />
          ) : query.isError ? (
            <Failure error={query.error} retry={() => void query.refetch()} />
          ) : query.data.items.length ? (
            <NftGrid items={query.data.items} />
          ) : (
            <div className="empty-state">
              <h2>Nenhum NFT encontrado</h2>
              <p>Altere a busca ou os filtros selecionados.</p>
            </div>
          )}
          {query.data && query.data.totalPages > 1 && (
            <nav className="pagination" aria-label="Paginacao">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Pagina anterior"
                disabled={search.page <= 1}
                onClick={() => change({ page: search.page - 1 })}
              >
                <ChevronLeft />
              </Button>
              <span className="sr-only">
                Pagina {search.page} de {query.data.totalPages}
              </span>
              {Array.from(
                { length: query.data.totalPages },
                (_, index) => index + 1,
              )
                .filter(
                  (page) =>
                    page === 1 ||
                    page === query.data.totalPages ||
                    Math.abs(page - search.page) <= 2,
                )
                .map((page, index, pages) => (
                  <span className="pagination-entry" key={page}>
                    {index > 0 && page - pages[index - 1] > 1 && (
                      <span aria-hidden="true">...</span>
                    )}
                    <Button
                      size="icon"
                      variant={page === search.page ? "default" : "outline"}
                      aria-label={`Pagina ${page}`}
                      aria-current={page === search.page ? "page" : undefined}
                      onClick={() => change({ page })}
                    >
                      {page}
                    </Button>
                  </span>
                ))}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Proxima pagina"
                disabled={search.page >= query.data.totalPages}
                onClick={() => change({ page: search.page + 1 })}
              >
                <ChevronRight />
              </Button>
            </nav>
          )}
        </div>
      </section>
      <CatalogFeatures
        items={highlights.data?.items ?? []}
        pending={highlights.isPending}
      />
    </>
  );
}
