"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { signIn, signOut, useSession } from "next-auth/react";
export const dynamic = "force-dynamic";

type ItemStatus = "queued" | "cooking" | "done";
type OrderItemView = { id: number; quantity: number; item_status: ItemStatus; product: { name: string } };
type TableView = { table_number: string };
type OrderView = { id: number; table: TableView; items: OrderItemView[] };
type OrderCardData = { order: OrderView; lateMs: number; waitMs: number };

function OrderCard({ data }: { data: OrderCardData }) {
  const startCooking = api.orders.startCooking.useMutation();
  const finishOrder = api.orders.finishOrder.useMutation();
  const o = data.order;
  const sinceMin = useMemo(() => Math.floor(data.waitMs / 60000), [data.waitMs]);
  const sinceSec = useMemo(() => Math.floor((data.waitMs % 60000) / 1000), [data.waitMs]);
  const headerColor = data.lateMs > 0 ? "bg-red-100 text-red-700" : sinceMin >= 6 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
  return (
    <div className="rounded-xl bg-white p-3 shadow">
      <div className={`mb-2 flex items-center justify-between rounded ${headerColor} px-3 py-2`}>
        <div className="font-semibold">Meja {o.table.table_number}</div>
        <div className="font-mono">{String(sinceMin).padStart(2, "0")}:{String(sinceSec).padStart(2, "0")}</div>
      </div>
      <div className="space-y-1 text-sm">
        {o.items.map((it) => (
          <div key={it.id} className="flex items-center justify-between">
            <div>
              <input type="checkbox" readOnly checked={it.item_status !== "queued"} className="mr-2" />
              {it.quantity} {it.product.name}
            </div>
            <div className="text-gray-600">{it.item_status === "queued" ? "Belum Dimasak" : it.item_status === "cooking" ? "Dimasak" : "Selesai"}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => startCooking.mutate({ orderId: o.id })}
          disabled={startCooking.isPending}
          className="flex-1 rounded bg-neutral-800 px-4 py-2 text-white"
        >
          Mulai Masak
        </button>
        <button
          onClick={() => finishOrder.mutate({ orderId: o.id })}
          disabled={finishOrder.isPending}
          className="flex-1 rounded bg-green-600 px-4 py-2 text-white"
        >
          Selesai
        </button>
      </div>
    </div>
  );
}

function CashierInner() {
  const { data: session } = useSession();
  const [refetchMs, setRefetchMs] = useState(5000);
  const active = api.orders.kitchenActive.useQuery(undefined, { refetchInterval: refetchMs });

  useEffect(() => {
    if (active.data?.totalDelay && active.data.totalDelay > 0) setRefetchMs(3000);
    else setRefetchMs(7000);
  }, [active.data?.totalDelay]);

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-100 p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Kasir / Dapur</h1>
            <div />
          </div>
          <div className="rounded-xl bg-white p-4 text-sm shadow">
            <div className="mb-2 text-sm">Silakan login untuk melihat dan mengelola pesanan.</div>
            <LoginForm />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">Dashboard Order</div>
            <div className="text-sm text-gray-600">Total Order Aktif: {active.data?.totalActive ?? 0} | Total Delay: {active.data?.totalDelay ?? 0}</div>
          </div>
          <button onClick={() => signOut()} className="rounded bg-neutral-800 px-3 py-2 text-white">Logout</button>
        </div>
        {session?.user?.role === "admin" && (
          <div className="mb-4 rounded-xl bg-white p-4 shadow">
            <div className="mb-2 text-sm font-semibold">Registrasi Staff</div>
            <RegistrationForm />
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {active.data?.orders.map((o) => (
            <OrderCard key={o.order.id} data={o as OrderCardData} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-2">
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        className="w-full rounded border border-neutral-300 p-2 text-sm"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="Password"
        className="w-full rounded border border-neutral-300 p-2 text-sm"
      />
      {error && <div className="text-xs text-red-600">{error}</div>}
      <button
        onClick={async () => {
          setPending(true);
          setError(null);
          const res = await signIn("credentials", { username, password, redirect: false });
          setPending(false);
          if (res?.error) setError("Login gagal. Periksa username/password.");
        }}
        disabled={pending || !username || !password}
        className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-60"
      >
        Login
      </button>
    </div>
  );
}

export default function CashierPage() {
  return (
    <Suspense>
      <CashierInner />
    </Suspense>
  );
}

function RegistrationForm() {
  const createStaff = api.staff.createStaffUser.useMutation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"cashier" | "admin">("cashier");
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="rounded border border-neutral-300 p-2"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="rounded border border-neutral-300 p-2"
        />
        <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "cashier")} className="rounded border border-neutral-300 p-2">
          <option value="cashier">Cashier</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {message && <div className="text-xs text-green-700">{message}</div>}
      {createStaff.error && <div className="text-xs text-red-600">{createStaff.error.message}</div>}
      <button
        onClick={() => {
          setMessage(null);
          createStaff.mutate(
            { username, password, role },
            {
              onSuccess: (u) => {
                setMessage(`Berhasil mendaftarkan: ${u.username} (${u.role})`);
                setUsername("");
                setPassword("");
                setRole("cashier");
              },
            }
          );
        }}
        disabled={createStaff.isPending || !username || !password}
        className="rounded bg-neutral-800 px-3 py-2 text-white disabled:opacity-60"
      >
        Daftarkan Staff
      </button>
    </div>
  );
}
