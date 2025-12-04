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
  const simulate = api.transactions.simulatePayment.useMutation({ onSuccess: () => router.push(`/track/${orderId}`) });
  const createPayment = api.transactions.createPayment.useMutation();
  const verify = api.transactions.verifyPayment.useMutation({
    onSuccess: (r) => {
      if (r.success) setPaid(true);
    },
  });
  const [pay, setPay] = useState<{ amount: number; qrUrl: string | null; externalId: string; actions?: Array<{ name?: string; url?: string }>; method: "qris" | "gopay" | "shopeepay" } | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const order = api.orders.getOrder.useQuery(
    { orderId },
    { enabled: paid && !!orderId, refetchInterval: paid ? 5000 : false }
  );

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (orderId && !pay && !createPayment.isPending) {
      createPayment.mutate(
        { orderId, method: "qris" },
        {
          onSuccess: (res) => setPay(res),
        }
      );
    }
  }, [orderId, pay, createPayment]);

  useEffect(() => {
    if (!orderId || !pay?.externalId || paid) return;
    const id = setInterval(() => {
      if (!verify.isPending) {
        void verify.mutate({ externalId: pay.externalId, orderId });
      }
    }, 7000);
    return () => clearInterval(id);
  }, [orderId, pay, paid, verify.isPending, verify]);

  const mm = useMemo(() => String(Math.floor(secondsLeft / 60)).padStart(2, "0"), [secondsLeft]);
  const ss = useMemo(() => String(secondsLeft % 60).padStart(2, "0"), [secondsLeft]);

  return (
    <div className="min-h-screen bg-neutral-100 p-4 text-neutral-900">
      {!paid ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <button onClick={() => router.push(`/cart`)} className="rounded bg-white px-2 py-1 shadow">←</button>
            <h1 className="text-lg font-bold">PEMBAYARAN</h1>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div>Selesaikan Pembayaran Dalam</div>
            <div className="text-2xl font-mono text-red-600">{mm}:{ss}</div>
            <div
              className="h-56 w-56 rounded-lg bg-white p-2 shadow bg-no-repeat bg-center"
              style={{ backgroundImage: pay?.qrUrl ? `url(${pay.qrUrl})` : "none", backgroundSize: "contain" }}
            >
              {!pay?.qrUrl && (
                <div className="flex h-full w-full items-center justify-center text-gray-400">QRIS</div>
              )}
            </div>
            <div className="text-sm">Tagihan: Rp {(pay?.amount ?? 0).toLocaleString("id-ID")}</div>

            <button
              onClick={() => pay?.qrUrl && window.open(pay.qrUrl, "_blank")}
              disabled={!pay?.qrUrl}
              className="w-56 rounded-full bg-gradient-to-r from-[#FFBC50] to-[#FF8400] px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              Unduh QRIS
            </button>
            <button
              onClick={() => {
                if (pay?.qrUrl) {
                  void navigator.clipboard.writeText(pay.qrUrl).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }
              }}
              disabled={!pay?.qrUrl}
              className="w-56 rounded-full bg-neutral-200 px-6 py-3 text-sm disabled:opacity-60"
            >
              Salin URL QR
            </button>
            {pay?.qrUrl && (
              <div className="w-56 break-all text-center text-xs text-gray-600">{pay.qrUrl}</div>
            )}
            {copied && <div className="text-xs text-green-700">Disalin</div>}
            <button
              onClick={() => pay && verify.mutate({ externalId: pay.externalId, orderId })}
              disabled={!pay || verify.isPending}
              className="w-56 rounded-full bg-gradient-to-r from-[#FFBC50] to-[#FF8400] px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              Verifikasi Pembayaran
            </button>

            {pay?.actions && pay.actions.length > 0 && (
              <button
                onClick={() => {
                  const deeplink = pay.actions?.find((a) => (a.name ?? "").toLowerCase().includes("deeplink"))?.url;
                  if (deeplink) window.open(deeplink, "_blank");
                }}
                className="w-56 rounded-full bg-neutral-200 px-6 py-3 text-sm"
              >
                Buka Aplikasi
              </button>
            )}

            <button
              onClick={() => simulate.mutate({ orderId })}
              disabled={simulate.isPending || !orderId}
              className="mt-2 w-56 rounded-full bg-neutral-200 px-6 py-3 text-sm"
            >
              Simulasi Bayar Sukses
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <h1 className="text-lg font-bold">PEMBAYARAN</h1>
          <div className="rounded-full bg-green-100 px-3 py-2 text-center text-green-700">Pembayaran Selesai!</div>
          <div className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow">
            <div className="text-green-700">Bayar</div>
            <div className="font-semibold">Antri</div>
            <div>Dimasak</div>
            <div>Selesai</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-3 text-center shadow">
              <div className="text-xs">Nomor Anda</div>
              <div className="text-2xl font-bold">{order.data?.order.queue_number}</div>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow">
              <div className="text-xs">Sedang Dilayani</div>
              <div className="text-2xl font-bold">{Math.max(0, Number(order.data?.order.queue_number ?? 0) - 2)}</div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-3 shadow">
            <div className="text-sm">Estimasi Selesai</div>
            <div className="font-mono text-green-700">
              {String(Math.floor((order.data?.etaMs ?? 0) / 60000)).padStart(2, "0")}:
              {String(Math.floor(((order.data?.etaMs ?? 0) % 60000) / 1000)).padStart(2, "0")}
            </div>
          </div>
          <div className="rounded-xl bg-white p-3 shadow">
            <div className="mb-2 text-sm">Status Makanan Anda</div>
            <div className="space-y-1 text-sm">
              {order.data?.order.items.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <div>
                    {it.quantity} {it.product.name}
                  </div>
                  <div className="text-gray-600">{it.item_status === "queued" ? "Belum Dimasak" : it.item_status === "cooking" ? "Dimasak" : "Selesai"}</div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => router.push(`/track/${orderId}`)}
            className="w-full rounded-full bg-gradient-to-r from-[#FFBC50] to-[#FF8400] px-6 py-3 font-semibold text-white"
          >
            Lihat Status Lengkap
          </button>
        </div>
      )}
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