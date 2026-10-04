import { X } from "lucide-react";
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useMarketplace } from "./MarketplaceProvider";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "./ui/drawer";
import { Button } from "./ui/button";
import { CartContent } from "./CartContent";

export function CartDrawer() {
  const { cartOpen, openCart } = useMarketplace();
  const previousFocus = useRef<HTMLElement | null>(null);
  return (
    <Drawer
      open={cartOpen}
      onOpenChange={openCart}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent
        className="cart-drawer"
        aria-describedby="cart-description"
        onOpenAutoFocus={(event) => {
          const active = document.activeElement;
          previousFocus.current =
            active instanceof HTMLElement && active !== document.body
              ? active
              : null;
          event.preventDefault();
          document
            .querySelector<HTMLButtonElement>('[aria-label="Fechar carrinho"]')
            ?.focus();
        }}
        onCloseAutoFocus={(event) => {
          const target = previousFocus.current?.isConnected
            ? previousFocus.current
            : document.querySelector<HTMLElement>(
                '[aria-label^="Abrir carrinho"]',
              );
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <div className="drawer-heading">
          <DrawerTitle>Carrinho de NFTs</DrawerTitle>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fechar carrinho"
            onClick={() => openCart(false)}
          >
            <X />
          </Button>
        </div>
        <DrawerDescription id="cart-description" className="sr-only">
          Itens e resumo do seu carrinho
        </DrawerDescription>
        {cartOpen && <CartContent close={() => openCart(false)} />}
        <Link
          to="/cart"
          className="continue-link"
          onClick={() => openCart(false)}
        >
          Ver carrinho completo
        </Link>
      </DrawerContent>
    </Drawer>
  );
}
