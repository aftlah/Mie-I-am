"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { useEffect, useMemo } from "react";

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

  const mm = useMemo(() => String(Math.floor(((data?.lateMs ?? 0) > 0 ? (data?.lateMs ?? 0) : (data?.etaMs ?? 0)) / 60000)).padStart(2, "0"), [data?.etaMs, data?.lateMs]);
  const ss = useMemo(() => String(Math.floor((((data?.lateMs ?? 0) > 0 ? (data?.lateMs ?? 0) : (data?.etaMs ?? 0)) % 60000) / 1000)).padStart(2, "0"), [data?.etaMs, data?.lateMs]);

  return (
    <div className="min-h-screen bg-neutral-100 p-4 text-neutral-900">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">STATUS PESANAN</h1>
          <div className="text-sm">#{data?.order.queue_number}</div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow">
          <div className={data?.order.status === "paid" ? "text-green-700 font-semibold" : "text-green-700"}>Bayar</div>
          <div className={data?.order.status === "paid" ? "font-semibold" : data?.order.status === "processing" ? "font-semibold" : ""}>Antri</div>
          <div className={data?.order.status === "processing" ? "font-semibold" : ""}>Dimasak</div>
          <div className={data?.order.status === "completed" ? "font-semibold" : ""}>Selesai</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-3 text-center shadow">
            <div className="text-xs">Nomor Anda</div>
            <div className="text-2xl font-bold">{data?.order.queue_number}</div>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow">
            <div className="text-xs">Sedang Dilayani</div>
            <div className="text-2xl font-bold">{
              (() => {
                const qn = Number(data?.order.queue_number ?? 0);
                const st = data?.order.status;
                return st === "processing" || st === "completed" ? qn : Math.max(0, qn - 2);
              })()
            }</div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-3 shadow">
          <div className="text-sm">Estimasi Selesai</div>
          {(data?.lateMs ?? 0) > 0 ? (
            <div className="font-mono text-red-600">{mm}:{ss}</div>
          ) : (
            <div className="font-mono text-green-700">{mm}:{ss}</div>
          )}
          <div className="text-xs text-gray-500">Menghitung mundur estimasi.</div>
        </div>

        <div className="rounded-xl bg-white p-3 shadow">
          <div className="mb-2 text-sm">Status Makanan Anda</div>
          <div className="space-y-1 text-sm">
            {data?.order.items.map((it) => (
              <div key={it.id} className="flex justify-between">
                <div>{it.product.name}</div>
                <div className="text-gray-600">{it.item_status === "queued" ? "Dalam antre" : it.item_status === "cooking" ? "Dimasak" : "Selesai"}</div>
              </div>
            ))}
          </div>
        </div>

        {(data?.lateMs ?? 0) > 0 && data?.order.status !== "completed" && (
          <div className="rounded-xl bg-white p-3 shadow border border-red-300">
            <div className="mb-2 flex items-center gap-2 text-red-700">
              <span>⚠️</span>
              <span className="font-semibold">Maaf, Menu Anda terlambat {Math.ceil((data?.lateMs ?? 0) / 60000)} menit karena pesanan padat</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
