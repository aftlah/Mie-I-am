"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";

function PaymentInner() {
  const params = useSearchParams();
  const router = useRouter();
  const orderIdParam = params.get("orderId") ?? localStorage.getItem("orderId") ?? "";
  const orderId = Number(orderIdParam);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const simulate = api.transactions.simulatePayment.useMutation({
    onSuccess: () => router.push(`/track/${orderId}`),
  });

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = useMemo(() => String(Math.floor(secondsLeft / 60)).padStart(2, "0"), [secondsLeft]);
  const ss = useMemo(() => String(secondsLeft % 60).padStart(2, "0"), [secondsLeft]);

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-white">
      <h1 className="mb-4 text-xl font-bold">Pembayaran (QRIS)</h1>

      <div className="flex flex-col items-center gap-4">
        <div className="h-56 w-56 rounded-lg bg-white/10" />
        <div className="text-2xl font-mono">{mm}:{ss}</div>
        <div>Menunggu Pembayaran...</div>
        <button
          onClick={() => simulate.mutate({ orderId })}
          disabled={simulate.isPending || !orderId}
          className="rounded-full bg-green-600 px-6 py-3"
        >
          Simulasi Bayar Sukses
        </button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense>
      <PaymentInner />
    </Suspense>
  );
}
