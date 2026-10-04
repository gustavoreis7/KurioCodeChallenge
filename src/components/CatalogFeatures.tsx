import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { NFT } from "@/types";
import { useMarketplace } from "./MarketplaceProvider";

const articles = [
  {
    title: "Como funciona a propriedade de NFTs",
    description: "Aprenda a colecionar, negociar e verificar ativos digitais.",
    date: "2026-09-12",
    label: "12 de setembro",
    minutes: 6,
  },
  {
    title: "10 artistas digitais para acompanhar",
    description: "Conheca criadores que moldam a cultura digital.",
    date: "2026-09-13",
    label: "13 de setembro",
    minutes: 2,
  },
  {
    title: "Raridade, atributos e procedencia",
    description:
      "Entenda raridade, procedencia, direitos autorais e utilidade.",
    date: "2026-09-15",
    label: "15 de setembro",
    minutes: 3,
  },
  {
    title: "Como proteger sua carteira",
    description: "Proteja sua carteira, seus ativos e sua identidade.",
    date: "2026-09-15",
    label: "15 de setembro",
    minutes: 2,
  },
];

export function CatalogFeatures({
  items,
  pending,
}: {
  items: NFT[];
  pending: boolean;
}) {
  const { announce } = useMarketplace();
  return (
    <>
      <section className="catalog-promotions" aria-label="Explore colecoes">
        {[
          {
            title: "Lancamentos genesis de edicao limitada",
            description:
              "Colecione edicoes escassas diretamente dos criadores.",
            category: "new",
          },
          {
            title: "Arte digital selecionada e muito mais",
            description: "Explore artistas e colecoes de obras digitais.",
            category: "original",
          },
        ].map((promotion, index) => (
          <div className="catalog-promotion" key={promotion.category}>
            <Artwork nft={items[index * 2]} pending={pending} />
            <div>
              <h2>{promotion.title}</h2>
              <p>{promotion.description}</p>
              <Link
                to="/"
                search={{ categories: [promotion.category], page: 1 }}
                hash="catalogo"
                className="primary-link"
                aria-label={`Explorar ${promotion.title}`}
              >
                Explorar <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        ))}
      </section>
      <section className="catalog-journal" aria-labelledby="journal-title">
        <header className="section-heading">
          <h2 id="journal-title">Diario da Cunhagem</h2>
          <p>
            Historias, guias e insights para colecionadores sobre a propriedade
            digital.
          </p>
        </header>
        <div className="journal-grid">
          {articles.map((article, index) => (
            <article className="journal-card" key={article.title}>
              <Artwork nft={items[[2, 0, 1, 3][index]]} pending={pending} />
              <div className="journal-content">
                <p className="journal-meta">
                  <time dateTime={article.date}>{article.label}</time>
                  <span aria-hidden="true"> | </span>
                  Leitura de {article.minutes} min
                </p>
                <h3>{article.title}</h3>
                <p>{article.description}</p>
                <button
                  type="button"
                  className="text-action"
                  aria-label={`Ler mais: ${article.title}`}
                  onClick={() =>
                    announce(
                      "Conteudo editorial indisponivel nesta demonstracao.",
                    )
                  }
                >
                  Ler mais <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Artwork({ nft, pending }: { nft?: NFT; pending: boolean }) {
  return nft ? (
    <img src={nft.imageUrl} alt="" width={768} height={768} loading="lazy" />
  ) : (
    <div
      className={`feature-artwork ${pending ? "shimmer" : ""}`}
      aria-hidden="true"
    />
  );
}
