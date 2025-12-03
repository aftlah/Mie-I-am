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

  const total = useMemo(() => cart.reduce((acc, i) => acc + parseFloat(i.price) * i.quantity, 0), [cart]);
  const tax = useMemo(() => total * 0.1, [total]);
  const estMinutes = useMemo(() => Math.max(18, cart.reduce((acc, i) => acc + 5 * i.quantity, 0)), [cart]);

  const createOrder = api.orders.createOrder.useMutation({
    onSuccess: ({ orderId }) => {
      localStorage.setItem("orderId", String(orderId));
      router.push(`/payment?orderId=${orderId}`);
    },
  });

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-white">
      <h1 className="mb-4 text-xl font-bold">Detail Pesanan</h1>

      <div className="space-y-3">
        {cart.map((i, idx) => (
          <div key={i.productId} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
            <div>
              <div className="font-semibold">{i.name}</div>
              <div className="text-xs text-gray-300">Rp {parseFloat(i.price).toLocaleString("id-ID")}</div>
              <input
                value={i.notes ?? ""}
                onChange={(e) => {
                  const copy = [...cart];
                  copy[idx]!.notes = e.target.value;
                  setCart(copy);
                  localStorage.setItem("cart", JSON.stringify(copy));
                }}
                placeholder="Catatan (opsional)"
                className="mt-2 w-full rounded bg-white/10 p-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const copy = [...cart];
                  copy[idx]!.quantity = Math.max(1, copy[idx]!.quantity - 1);
                  setCart(copy);
                  localStorage.setItem("cart", JSON.stringify(copy));
                }}
                className="rounded-full bg-white/10 px-3 py-1"
              >
                -
              </button>
              <div>{i.quantity}</div>
              <button
                onClick={() => {
                  const copy = [...cart];
                  copy[idx]!.quantity += 1;
                  setCart(copy);
                  localStorage.setItem("cart", JSON.stringify(copy));
                }}
                className="rounded-full bg-white/10 px-3 py-1"
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
          className="w-full rounded bg-white/10 p-2 text-sm"
        />

        <div className="rounded-lg bg-white/5 p-3">
          <div>Subtotal: Rp {total.toLocaleString("id-ID")}</div>
          <div>Pajak: Rp {tax.toLocaleString("id-ID")}</div>
          <div className="font-semibold">Total: Rp {(total + tax).toLocaleString("id-ID")}</div>
        </div>

        <div className="rounded-lg bg-blue-900/30 p-3">
          <div className="text-sm">Estimasi Total Waktu Tunggu: ≈ {estMinutes} Menit.</div>
          <div className="text-xs text-gray-300">Waktu dihitung berdasarkan antrean saat ini.</div>
        </div>
      </div>

      <button
        onClick={() =>
          createOrder.mutate({
            tableNumber,
            customerName,
            items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, notes: c.notes })),
          })
        }
        disabled={createOrder.isPending || cart.length === 0}
        className="mt-6 w-full rounded-full bg-green-600 p-3 font-semibold"
      >
        Bayar & Pesan (QRIS)
      </button>
    </div>
  );
}

