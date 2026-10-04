# Diagnosticos E2E

`prior-e2e/` preserva traces e capturas da rodada anterior.

- Cotacao/esgotamento: o seletor generico encontrava dois alertas corretos da UI.
  O teste agora verifica especificamente o erro de quantidade indisponivel.
- Inicializacao: o reset de mocks podia anteceder a restauracao de sessao e sua
  resposta era descartada pelo interceptor de seguranca. O setup agora espera
  o catalogo carregado antes de configurar o cenario.

O resultado final esta em `reports/e2e/`; estes arquivos nao sao falhas pendentes.
