"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function HomeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tableParam = params.get("table") ?? "";
  const [tableNumber, setTableNumber] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const savedTable = localStorage.getItem("tableNumber") ?? "";
    const savedName = localStorage.getItem("customerName") ?? "";
    setTableNumber(tableParam || savedTable || "1");
    setName(savedName);
  }, [tableParam]);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto max-w-sm p-6">
        <div className="mb-6 flex justify-center">
          <div className="h-16 w-16 rounded bg-neutral-300" />
        </div>
        <div className="mb-4 text-center text-[16px]">Selamat Datang di Mie I&apos;am</div>

        <div className="rounded-xl bg-white p-5 shadow">
          <div className="mb-2 text-center text-[14px]">Nomor meja kamu :</div>
          <div className="mb-4 text-center text-[40px] font-bold">{tableNumber}</div>

          <div className="mb-2 text-[14px]">Input nama kamu!</div>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            placeholder="Nama kamu"
            className="w-full rounded border border-neutral-300 bg-white p-2 text-sm"
          />
          {error && <div className="mt-1 text-xs text-red-600">{error}</div>}

          <button
            onClick={() => {
              if (!canSubmit) {
                setError("Tolong input nama kamu!");
                return;
              }
              localStorage.setItem("customerName", name.trim());
              localStorage.setItem("tableNumber", tableNumber);
              router.push(`/menu?table=${tableNumber}`);
            }}
            disabled={!canSubmit}
            className="mt-4 w-full rounded-full bg-gradient-to-r from-[#FFBC50] to-[#FF8400] p-3 text-center font-semibold text-white disabled:opacity-60"
          >
            Order now
          </button>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}
