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
  const [selectedCat, setSelectedCat] = useState<number | "all">("all");
  const [quickIndex, setQuickIndex] = useState(0);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

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
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="text-lg font-bold">MENU</div>
        <div className="rounded-full bg-neutral-200 px-3 py-1 text-sm">Meja #{tableNumber}</div>
      </header>

      <div className="mx-4 mb-3 flex items-center gap-2">
        <div className="rounded bg-neutral-200 px-2 py-1 text-sm">⚗️</div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCat("all")}
            className={`rounded-full px-3 py-1 text-sm ${selectedCat === "all" ? "bg-black text-white" : "bg-neutral-200"}`}
          >
            Semua
          </button>
          {cats.data?.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`rounded-full px-3 py-1 text-sm ${selectedCat === c.id ? "bg-black text-white" : "bg-neutral-200"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <section className="mx-4 mb-4 rounded-xl bg-white p-4 shadow">
        <div className="mb-2 text-sm font-semibold">Pesanan Cepat</div>
        {quick.data && quick.data.length > 0 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setQuickIndex((i) => Math.max(0, i - 1))}
              className="rounded bg-neutral-200 px-2 py-1"
            >
              ◀
            </button>
            <div className="mx-2 flex-1 rounded-lg bg-neutral-100 p-3">
              {(() => {
                const q = quick.data?.[quickIndex];
                if (!q) return null;
                const qty = cart.find((x) => x.productId === q.id)?.quantity ?? 0;
                const priceQ = parseFloat(String(q.price));
                return (
              <>
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded bg-neutral-300" />
                <div className="flex-1 px-3">
                  <div className="text-sm font-semibold">{q.name}</div>
                  <div className="text-xs text-gray-500">Detail pendek</div>
                  <div className="text-xs font-semibold">Rp {priceQ.toLocaleString("id-ID")}</div>
                </div>
                <div className="text-xs text-orange-500">2 Menit</div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() =>
                    setCart((c) => {
                      const p = q;
                      const idx = c.findIndex((x) => x.productId === p.id);
                      if (idx >= 0) {
                        const copy = [...c];
                        copy[idx]!.quantity = Math.max(0, copy[idx]!.quantity - 1);
                        return copy.filter((it) => it.quantity > 0);
                      }
                      return c;
                    })
                  }
                  className="rounded-full bg-red-100 px-3 py-1 text-red-600"
                >
                  −
                </button>
                <div className="min-w-6 text-center text-sm">{qty}</div>
                <button
                  onClick={() =>
                    setCart((c) => {
                      const p = q;
                      const idx = c.findIndex((x) => x.productId === p.id);
                      if (idx >= 0) {
                        const copy = [...c];
                        copy[idx]!.quantity += 1;
                        return copy;
                      }
                      return [...c, { productId: p.id, name: p.name, price: p.price.toString(), quantity: 1 }];
                    })
                  }
                  className="rounded-full bg-green-100 px-3 py-1 text-green-700"
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1 text-xs">
                {quick.data.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setQuickIndex(i)}
                    className={`h-2 w-2 rounded-full ${i === quickIndex ? "bg-black" : "bg-neutral-300"}`}
                  />
                ))}
              </div>
              </>
                );
              })()}
            </div>
            <button
              onClick={() => setQuickIndex((i) => Math.min((quick.data?.length ?? 1) - 1, i + 1))}
              className="rounded bg-neutral-200 px-2 py-1"
            >
              ▶
            </button>
          </div>
        )}
      </section>

      <div className="mx-4 space-y-4">
        {(cats.data ?? [])
          .filter((cat) => selectedCat === "all" || cat.id === selectedCat)
          .map((cat) => (
            <div key={cat.id} className="rounded-xl bg-white p-3 shadow">
              <div className="mb-2 text-base font-semibold">{cat.name}</div>
              <div className="space-y-3">
                {cat.products.map((p) => {
                  const qty = cart.find((x) => x.productId === p.id)?.quantity ?? 0;
                  const priceP = parseFloat(String(p.price));
                  const estMin = Math.max(2, Math.ceil(p.base_duration_seconds / 60));
                  const open = expanded[p.id] ?? false;
                  return (
                    <div key={p.id} className="rounded-lg bg-neutral-100 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 rounded bg-neutral-300" />
                          <div>
                            <div className="text-sm font-semibold">{p.name}</div>
                            <div className="text-xs text-gray-500">Detail pendek</div>
                            <div className="text-xs font-semibold">Rp {priceP.toLocaleString("id-ID")}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">{estMin}–{estMin + 2} Menit</div>
                      </div>
                      {open && (
                        <div className="mt-2 text-xs text-gray-600">Detail lengkap, lorem ipsum deskripsi produk.</div>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          onClick={() => setExpanded((e) => ({ ...e, [p.id]: !open }))}
                          className="text-xs text-green-700"
                        >
                          {open ? "See less" : "See more"}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setCart((c) => {
                                const idx = c.findIndex((x) => x.productId === p.id);
                                if (idx >= 0) {
                                  const copy = [...c];
                                  copy[idx]!.quantity = Math.max(0, copy[idx]!.quantity - 1);
                                  return copy.filter((it) => it.quantity > 0);
                                }
                                return c;
                              })
                            }
                            className="rounded-full bg-red-100 px-3 py-1 text-red-600"
                          >
                            −
                          </button>
                          <div className="min-w-6 text-center text-sm">{qty}</div>
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
                            className="rounded-full bg-green-100 px-3 py-1 text-green-700"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 mx-4 mb-4">
        <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow">
          <div className="text-sm">
            {cart.length} Produk
            <div className="text-xs text-gray-600">Rp {total.toLocaleString("id-ID")}</div>
          </div>
          <button
            onClick={() => router.push("/cart")}
            className="rounded-full bg-gradient-to-r from-[#FFBC50] to-[#FF8400] px-4 py-2 text-sm font-semibold text-white"
          >
            Lihat Pesanan
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
