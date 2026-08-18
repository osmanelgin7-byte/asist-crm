"use client";
import { apiFetch } from "@/lib/api-client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Modal } from "@/components/modal";
import { Input, Select } from "@/components/form-fields";
import {
  Card, CardBody,
  DataTable, DataTableHead, DataTableHeader, DataTableBody, DataTableRow, DataTableCell, EmptyState,
} from "@/components/ui/card";
import { roleLabels, roleColors, type Role } from "@/lib/permissions";
import {
  APP_TABS,
  CONFIGURABLE_TAB_IDS,
  getDefaultTabsForRole,
  getTabLabel,
  isTabRestrictedForRole,
  parseAllowedTabs,
  type AppTabId,
} from "@/lib/app-tabs";
import { formatDate, cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  allowedTabs: string | null;
  active: boolean;
  createdAt: string;
}

function getEffectiveConfigurableTabs(role: Role, allowedTabs: string | null): AppTabId[] {
  const custom = parseAllowedTabs(allowedTabs);
  const effective = custom && custom.length > 0 ? custom : getDefaultTabsForRole(role);
  return CONFIGURABLE_TAB_IDS.filter((tabId) => effective.includes(tabId));
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("PLANLAMA");
  const [useRoleDefaults, setUseRoleDefaults] = useState(true);
  const [selectedTabs, setSelectedTabs] = useState<AppTabId[]>([]);
  const [error, setError] = useState("");

  const configurableTabs = useMemo(
    () =>
      APP_TABS.filter(
        (tab) => CONFIGURABLE_TAB_IDS.includes(tab.id) && !isTabRestrictedForRole(role, tab.id)
      ),
    [role]
  );

  async function loadUsers() {
    const res = await apiFetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  useEffect(() => { loadUsers(); }, []);

  function resetTabSelection(nextRole: Role, allowedTabs: string | null) {
    const custom = parseAllowedTabs(allowedTabs);
    if (custom && custom.length > 0) {
      setUseRoleDefaults(false);
      setSelectedTabs(getEffectiveConfigurableTabs(nextRole, allowedTabs));
      return;
    }
    setUseRoleDefaults(true);
    setSelectedTabs(getDefaultTabsForRole(nextRole).filter((tabId) => CONFIGURABLE_TAB_IDS.includes(tabId)));
  }

  function openCreate() {
    setEditUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("PLANLAMA");
    resetTabSelection("PLANLAMA", null);
    setError("");
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setRole(user.role);
    resetTabSelection(user.role, user.allowedTabs);
    setError("");
    setModalOpen(true);
  }

  function toggleTab(tabId: AppTabId) {
    setUseRoleDefaults(false);
    setSelectedTabs((prev) =>
      prev.includes(tabId) ? prev.filter((id) => id !== tabId) : [...prev, tabId]
    );
  }

  function handleRoleChange(nextRole: Role) {
    setRole(nextRole);
    if (useRoleDefaults) {
      setSelectedTabs(getDefaultTabsForRole(nextRole).filter((tabId) => CONFIGURABLE_TAB_IDS.includes(tabId)));
    }
  }

  function handleUseRoleDefaults(checked: boolean) {
    setUseRoleDefaults(checked);
    if (checked) {
      setSelectedTabs(getDefaultTabsForRole(role).filter((tabId) => CONFIGURABLE_TAB_IDS.includes(tabId)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const allowedTabsPayload = useRoleDefaults ? null : selectedTabs;
    const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
    const body: Record<string, unknown> = {
      name,
      email,
      role,
      allowedTabs: allowedTabsPayload,
    };

    if (!editUser) {
      body.username = email.split("@")[0] || name.toLowerCase().replace(/\s+/g, ".");
      body.password = password;
    } else if (password) {
      body.password = password;
    }

    const res = await apiFetch(url, {
      method: editUser ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setError((await res.json()).error ?? "Bir hata oluştu");
      return;
    }

    setModalOpen(false);
    loadUsers();
  }

  async function toggleActive(user: User) {
    await apiFetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    loadUsers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    await apiFetch(`/api/users/${id}`, { method: "DELETE" });
    loadUsers();
  }

  return (
    <div>
      <PageHeader
        title="Kullanıcı Yönetimi"
        description="Ekip üyelerini, rollerini ve sekme erişimlerini yönetin"
        breadcrumb={["Ana Sayfa", "Kullanıcılar"]}
        action={<Button variant="accent" onClick={openCreate}><Plus className="h-4 w-4" /> Yeni Kullanıcı</Button>}
      />

      <Card>
        <CardBody flush>
          {users.length === 0 ? (
            <EmptyState message="Kullanıcı bulunamadı" />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeader>Kullanıcı</DataTableHeader>
                <DataTableHeader>Rol</DataTableHeader>
                <DataTableHeader>Sekmeler</DataTableHeader>
                <DataTableHeader>Durum</DataTableHeader>
                <DataTableHeader>Kayıt</DataTableHeader>
                <DataTableHeader>İşlemler</DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {users.map((user) => {
                  const tabs = getEffectiveConfigurableTabs(user.role, user.allowedTabs);
                  const custom = parseAllowedTabs(user.allowedTabs);
                  return (
                    <DataTableRow key={user.id}>
                      <DataTableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900">{user.name}</p>
                            <p className="text-xs text-zinc-500">{user.email}</p>
                          </div>
                        </div>
                      </DataTableCell>
                      <DataTableCell><Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge></DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-wrap gap-1">
                          {custom && custom.length > 0 ? (
                            tabs.map((tabId) => (
                              <span key={tabId} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                                {getTabLabel(tabId)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-zinc-400">Rol varsayılanı</span>
                          )}
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <button onClick={() => toggleActive(user)} className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                          user.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60" : "bg-red-50 text-red-700 ring-red-200/60"
                        )}>{user.active ? "Aktif" : "Pasif"}</button>
                      </DataTableCell>
                      <DataTableCell className="text-zinc-500">{formatDate(user.createdAt)}</DataTableCell>
                      <DataTableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(user)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">{error}</p>}
          <Input label="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="E-posta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label={editUser ? "Yeni Şifre (boş bırakılabilir)" : "Şifre"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editUser} />
          <Select
            label="Rol"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as Role)}
            options={[
              { value: "PLANLAMA", label: roleLabels.PLANLAMA },
              { value: "ADMIN", label: roleLabels.ADMIN },
            ]}
          />

          <section className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-900">Sekme Yetkileri</p>
                <p className="text-xs text-zinc-500">Kullanıcının menüde görebileceği sekmeler</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={useRoleDefaults}
                  onChange={(e) => handleUseRoleDefaults(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                Rol varsayılanı
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {configurableTabs.map((tab) => (
                <label
                  key={tab.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                    useRoleDefaults
                      ? "border-zinc-200 bg-white text-zinc-400"
                      : selectedTabs.includes(tab.id)
                        ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                        : "border-zinc-200 bg-white text-zinc-700"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={useRoleDefaults ? getDefaultTabsForRole(role).includes(tab.id) : selectedTabs.includes(tab.id)}
                    disabled={useRoleDefaults}
                    onChange={() => toggleTab(tab.id)}
                    className="rounded border-zinc-300"
                  />
                  {tab.label}
                </label>
              ))}
            </div>

            <p className="mt-3 text-xs text-zinc-400">
              Ana Sayfa her zaman görünür. Yönetici rolündeki kullanıcılar Kullanıcılar sekmesini otomatik görür.
              Planlayıcı rolü Faturalar, Raporlama, Kullanıcılar ve İnsan Kaynakları sekmelerine erişemez.
              Sekme değişiklikleri kullanıcı yeniden giriş yaptığında aktif olur.
            </p>
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>İptal</Button>
            <Button type="submit" variant="accent">{editUser ? "Kaydet" : "Oluştur"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
