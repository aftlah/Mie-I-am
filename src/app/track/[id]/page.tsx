"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { useEffect } from "react";

export default function TrackPage() {
  const params = useParams();
  const orderId = Number(params?.id);
  const { data, refetch } = api.orders.getOrder.useQuery({ orderId }, { enabled: !!orderId, refetchInterval: 3000 });

  useEffect(() => {
    const id = setInterval(() => {
      void refetch();
    }, 3000);
    return () => clearInterval(id);
  }, [refetch]);

  const statusSteps = ["pending_payment", "paid", "processing", "completed"] as const;
  const activeIdx = statusSteps.indexOf(data?.order.status ?? "pending_payment");

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-white">
      <h1 className="mb-4 text-xl font-bold">Pesanan #{data?.order.queue_number}</h1>

      <div className="mb-4 flex items-center justify-between">
        {statusSteps.map((s, i) => (
          <div key={s} className={`flex-1 text-center ${i <= activeIdx ? "text-green-400" : "text-gray-400"}`}>
            {s}
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white/5 p-3">
        <div>Nomor Anda: {data?.order.queue_number}</div>
        <div>Sedang Dilayani: {Math.max(0, (Number(data?.order.queue_number) - 3))}</div>
      </div>

      <div className="mt-4 rounded-lg bg-blue-900/30 p-3">
        <div className="text-2xl font-mono">
          {Math.floor((data?.etaMs ?? 0) / 60000)}:{String(Math.floor(((data?.etaMs ?? 0) % 60000) / 1000)).padStart(2, "0")}
        </div>
        <div className="text-xs text-gray-300">Menghitung mundur estimasi.</div>
      </div>

      <div className="mt-4 space-y-2">
        {data?.order.items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
            <div>{it.product.name}</div>
            <div className="text-sm text-gray-300">{it.item_status === "queued" ? "Dalam antre" : it.item_status === "cooking" ? "Dimasak" : "Selesai"}</div>
          </div>
        ))}
      </div>

      {data && data.order.status !== "completed" && (
        <div className="mt-4 rounded bg-yellow-900/30 p-3 text-yellow-200">Maaf, pesanan terlambat karena antrian padat.</div>
      )}
    </div>
  );
}
