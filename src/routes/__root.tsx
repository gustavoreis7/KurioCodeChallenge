import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import appCss from "../styles.css?url";
import responsiveCss from "../responsive.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import {
  MarketplaceProvider,
  useMarketplace,
} from "@/components/MarketplaceProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const CartDrawer = lazy(() =>
  import("@/components/CartDrawer").then((module) => ({
    default: module.CartDrawer,
  })),
);

function CartDrawerOverlay() {
  const { cartOpen } = useMarketplace();
  const [hasOpened, setHasOpened] = useState(false);
  useEffect(() => {
    if (cartOpen) setHasOpened(true);
  }, [cartOpen]);
  return cartOpen || hasOpened ? (
    <Suspense
      fallback={
        <p className="sr-only" role="status">
          Carregando carrinho
        </p>
      }
    >
      <CartDrawer />
    </Suspense>
  ) : null;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Pagina nao encontrada
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta pagina nao existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Nao foi possivel carregar esta pagina
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente novamente ou volte ao inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-none"
          >
            Tentar novamente
          </Button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Kurio | Marketplace NFT" },
        { name: "description", content: "Marketplace de NFTs colecionáveis." },
        { name: "author", content: "Kurio" },
        { property: "og:title", content: "Kurio" },
        {
          property: "og:description",
          content: "Marketplace de NFTs colecionáveis.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "icon", type: "image/webp", href: "/artworks/emerald-ape.webp" },
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "stylesheet", href: responsiveCss },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const screen = pathname.startsWith("/orders/")
    ? "receipt"
    : pathname.split("/")[1] || "home";
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
    return () => {
      delete document.documentElement.dataset.hydrated;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MarketplaceProvider>
        <a href="#main-content" className="skip-link">
          Ir para o conteudo
        </a>
        <div className="site-container" data-screen={screen}>
          <Header />
          <main id="main-content">
            <Outlet />
          </main>
          <Footer />
        </div>
        <CartDrawerOverlay />
      </MarketplaceProvider>
    </QueryClientProvider>
  );
}
