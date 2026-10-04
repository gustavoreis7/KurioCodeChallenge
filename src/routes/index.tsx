import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { CatalogPage } from "@/pages/CatalogPage";
import { catalogSearch, validateCatalogSearch } from "@/services/search";

export const Route = createFileRoute("/")({
  validateSearch: validateCatalogSearch,
  search: { middlewares: [stripSearchParams(catalogSearch({}))] },
  head: () => ({ meta: [{ title: "Kurio | Mercado de arte digital" }] }),
  component: () => <CatalogPage search={Route.useSearch()} />,
});
