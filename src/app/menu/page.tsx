"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";

type CartItem = { productId: number; name: string; price: string; quantity: number };

function MenuInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tableNumber = params.get("table") ?? "1";
  const cats = api.categories.list.useQuery();
  const quick = api.products.quickJobs.useQuery();
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("cart");
    if (raw) setCart(JSON.parse(raw) as CartItem[]);
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("tableNumber", tableNumber);
  }, [cart, tableNumber]);

  const total = useMemo(() => {
    return cart.reduce((acc, i) => acc + parseFloat(i.price) * i.quantity, 0);
  }, [cart]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex items-center justify-between p-4">
        <div className="font-bold">MIE-IAM</div>
        <div className="rounded-full bg-white/10 px-3 py-1">Nomor Meja #{tableNumber}</div>
      </header>

      <section className="mx-4 mb-6 rounded-xl bg-blue-900/30 p-4">
        <div className="text-sm">Dapur sedang sibuk (Antrean 25 menit). Mau yang cepat?</div>
        <div className="mt-3 flex gap-3 overflow-x-auto">
          {quick.data?.map((p) => (
            <button
              key={p.id}
              onClick={() =>
                setCart((c) => {
                  const idx = c.findIndex((x) => x.productId === p.id);
                  if (idx >= 0) {
                    const copy = [...c];
                    copy[idx]!.quantity += 1;
                    return copy;
                  }
                  return [...c, { productId: p.id, name: p.name, price: p.price.toString(), quantity: 1 }];
                })
              }
              className="min-w-48 rounded-lg bg-white/10 p-3 text-left"
            >
              <div className="text-sm">{p.name}</div>
              <div className="text-xs text-orange-300">Siap dalam 2 menit</div>
            </button>
          ))}
        </div>
      </section>

      <div className="mx-4">
        {cats.data?.map((cat) => (
          <div key={cat.id} className="mb-6">
            <h2 className="mb-2 text-lg font-semibold">{cat.name}</h2>
            <div className="grid grid-cols-1 gap-3">
              {cat.products.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                  <div>
                    <div>{p.name}</div>
                    <div className="text-xs text-gray-300">Est. Masak: {p.base_duration_seconds / 60}-{Math.ceil(p.base_duration_seconds / 60) + 2} mnt</div>
                  </div>
                  <button
                    onClick={() =>
                      setCart((c) => {
                        const idx = c.findIndex((x) => x.productId === p.id);
                        if (idx >= 0) {
                          const copy = [...c];
                          copy[idx]!.quantity += 1;
                          return copy;
                        }
                        return [...c, { productId: p.id, name: p.name, price: p.price.toString(), quantity: 1 }];
                      })
                    }
                    className="rounded-full bg-white/10 px-3 py-1"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 mx-4 mb-4">
        <div className="flex items-center justify-between rounded-full bg-white/10 px-4 py-3">
          <div>
            {cart.length} Item | Rp {total.toLocaleString("id-ID")}
          </div>
          <button
            onClick={() => router.push("/cart")}
            className="rounded-full bg-white/20 px-4 py-2"
          >
            Lihat Pesanan {">"}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense>
      <MenuInner />
    </Suspense>
  );
}
