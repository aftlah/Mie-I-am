"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

type CartItem = { productId: number; name: string; price: string; quantity: number; notes?: string };

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const tableNumber = typeof window !== "undefined" ? localStorage.getItem("tableNumber") ?? "1" : "1";
  useEffect(() => {
    const raw = localStorage.getItem("cart");
    if (raw) setCart(JSON.parse(raw) as CartItem[]);
  }, []);
  const productDetails = api.products.byIds.useQuery(cart.map((c) => c.productId), { enabled: cart.length > 0 });

  const total = useMemo(() => cart.reduce((acc, i) => acc + parseFloat(i.price) * i.quantity, 0), [cart]);
  const tax = useMemo(() => total * 0.1, [total]);
  const estMinutes = useMemo(() => Math.max(18, cart.reduce((acc, i) => acc + 5 * i.quantity, 0)), [cart]);

  const createOrder = api.orders.createOrder.useMutation();

  return (
    <div className="min-h-screen bg-neutral-100 p-4 text-neutral-900">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => router.push(`/menu?table=${tableNumber}`)} className="rounded bg-white px-2 py-1 shadow">←</button>
        <h1 className="text-lg font-bold">DETAIL PESANAN</h1>
      </div>

      <div className="space-y-3">
        {cart.map((i, idx) => (
          <div key={i.productId} className="rounded-xl bg-white p-3 shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded bg-neutral-300" />
                <div>
                  <div className="text-sm font-semibold">{i.name}</div>
                  <div className="text-xs font-semibold">Rp {parseFloat(i.price).toLocaleString("id-ID")}</div>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                {(() => {
                  const p = productDetails.data?.find((pd) => pd.id === i.productId);
                  const est = p ? Math.max(2, Math.ceil(p.base_duration_seconds / 60)) : 2;
                  return `${est} Menit`;
                })()}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">(Opsional) Note: {i.notes ?? "-"}</div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const copy = [...cart];
                  copy[idx]!.quantity = Math.max(1, copy[idx]!.quantity - 1);
                  setCart(copy);
                  localStorage.setItem("cart", JSON.stringify(copy));
                }}
                className="rounded-full bg-red-100 px-3 py-1 text-red-700"
              >
                −
              </button>
              <div>{i.quantity}</div>
              <button
                onClick={() => {
                  const copy = [...cart];
                  copy[idx]!.quantity += 1;
                  setCart(copy);
                  localStorage.setItem("cart", JSON.stringify(copy));
                }}
                className="rounded-full bg-green-100 px-3 py-1 text-green-700"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nama Pemesan (Opsional)"
          className="w-full rounded bg-white p-2 text-sm shadow"
        />

        <div className="rounded-xl bg-white p-3 shadow">
          <div className="mb-2 flex items-center gap-2 text-sm">
            <div className="h-5 w-5 rounded-full bg-neutral-200" />
            <div>Estimasi Total Waktu Tunggu: ≈ {Math.max(18, estMinutes)} Menit</div>
          </div>
          <div className="text-xs text-gray-500">Waktu dihitung berdasarkan antrian saat ini.</div>
        </div>

        <div className="rounded-xl bg-white p-3 shadow">
          <div className="mb-2 text-sm font-semibold">Total Pembayaran</div>
          <div className="space-y-1 text-sm">
            {cart.map((i) => (
              <div key={i.productId} className="flex justify-between">
                <div>
                  {i.quantity} {i.name}
                </div>
                <div>Rp {(parseFloat(i.price) * i.quantity).toLocaleString("id-ID")}</div>
              </div>
            ))}
            <div className="flex justify-between text-xs text-gray-600">
              <div>Pajak</div>
              <div>Rp {tax.toLocaleString("id-ID")}</div>
            </div>
            <div className="mt-1 border-t pt-2 text-sm font-bold">
              <div className="flex justify-between">
                <div>TOTAL</div>
                <div>Rp {(total + tax).toLocaleString("id-ID")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          createOrder.mutate(
            {
              tableNumber,
              customerName,
              items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, notes: c.notes })),
            },
            {
              onSuccess: ({ orderId }) => {
                localStorage.setItem("orderId", String(orderId));
                router.push(`/payment?orderId=${orderId}&method=qris`);
              },
            }
          );
        }}
        disabled={createOrder.isPending || cart.length === 0}
        className="mt-6 w-full rounded-full bg-gradient-to-r from-[#FFBC50] to-[#FF8400] p-3 font-semibold text-white"
      >
        Bayar Sekarang (QRIS)
      </button>
    </div>
  );
}
