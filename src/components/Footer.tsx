import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Linkedin, Youtube } from "lucide-react";
import { useMarketplace } from "./MarketplaceProvider";

const benefits = [
  {
    symbol: "W",
    title: "Seguranca da carteira",
    description:
      "Proteja sua carteira e colecione arte digital verificada com confianca.",
  },
  {
    symbol: "C",
    title: "Criadores em destaque",
    description:
      "Conheca artistas, estudios e comunidades que moldam a cultura digital na rede.",
  },
  {
    symbol: "D",
    title: "Alertas de lancamentos",
    description:
      "Receba calendarios de cunhagem, novidades e analises do mercado.",
  },
];
const help = [
  "Central de ajuda",
  "Como comprar NFTs",
  "Carteira e seguranca",
  "Politica do mercado",
  "Denunciar item",
];
const socials = [
  { label: "Facebook", Icon: Facebook },
  { label: "Instagram", Icon: Instagram },
  { label: "Twitter", Icon: Twitter },
  { label: "LinkedIn", Icon: Linkedin },
  { label: "YouTube", Icon: Youtube },
];

export function Footer() {
  const { announce } = useMarketplace();
  return (
    <footer className="site-footer">
      <div className="footer-benefits">
        {benefits.map((benefit) => (
          <section key={benefit.symbol}>
            <span className="benefit-symbol" aria-hidden="true">
              {benefit.symbol}
            </span>
            <h2>{benefit.title}</h2>
            <p>{benefit.description}</p>
          </section>
        ))}
        <section className="footer-newsletter">
          <h2>Antecipe-se ao proximo lancamento</h2>
          <div className="newsletter-field">
            <label htmlFor="newsletter-email" className="sr-only">
              E-mail para lancamentos
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="digite seu e-mail..."
              disabled
              aria-describedby="newsletter-state"
            />
            <button type="button" disabled title="Inscricoes indisponiveis">
              Enviar
            </button>
          </div>
          <p>
            Receba lancamentos selecionados, historias de criadores e novidades
            do mercado.
          </p>
          <p id="newsletter-state" className="auxiliary-state">
            Inscricoes indisponiveis nesta demonstracao.
          </p>
        </section>
      </div>
      <div className="footer-strip">
        <Link to="/" className="brand">
          KURIO
        </Link>
        <span>Feito para colecionadores, criadores e cultura.</span>
        <span className="footer-contact">contato@email.com</span>
        <span className="footer-contact">+55 11 4002 8922</span>
      </div>
      <div className="footer-links">
        <section>
          <h2>Meu perfil</h2>
          <Link to="/profile">Meu perfil</Link>
          <Link to="/wallets">Carteiras</Link>
          <Link to="/orders">Pedidos</Link>
        </section>
        <section>
          <h2>Central de ajuda</h2>
          {help.map((label) => (
            <button
              type="button"
              key={label}
              onClick={() =>
                announce("Central de ajuda indisponivel nesta demonstracao.")
              }
            >
              {label}
            </button>
          ))}
        </section>
        <section>
          <h2>Colecoes</h2>
          <Link to="/" search={{ categories: ["original"] }}>
            Arte digital
          </Link>
          <Link to="/" search={{ categories: ["rare"] }}>
            Raridades
          </Link>
          <Link to="/" search={{ categories: ["new"] }}>
            Novidades
          </Link>
        </section>
        <section>
          <h2>Redes sociais</h2>
          <div
            className="footer-socials"
            aria-label="Redes sociais indisponiveis"
          >
            {socials.map(({ label, Icon }) => (
              <button
                type="button"
                key={label}
                disabled
                aria-label={label}
                title={`${label}: indisponivel`}
              >
                <Icon size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
          <h2 className="footer-wallet-title">Carteiras compativeis</h2>
          <p className="wallet-networks">Ethereum · Polygon</p>
          <p>Transacoes simuladas</p>
        </section>
      </div>
      <p className="copyright">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  );
}
