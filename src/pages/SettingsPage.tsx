import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPlus,
  faKey,
  faSpinner,
  faBoxArchive,
  faRotateLeft,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface User {
  id: string;
  email: string;
  name: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }
  return res.json();
}

type SettingsTab = "users" | "app";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const { refresh: refreshSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>("users");

  // ──── User management state ────
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // New user form
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Reset password
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  // ──── App settings state ────
  const [siteTitle, setSiteTitle] = useState("The Colorado Sun Map Tool");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // ──── Fetch users ────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/users");
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  // ──── Fetch settings ────
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const data = await apiFetch("/settings");
      if (data.settings.site_title) setSiteTitle(data.settings.site_title);
    } catch (e) {
      setSettingsError(
        e instanceof Error ? e.message : "Failed to load settings",
      );
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, [fetchUsers, fetchSettings]);

  // ──── User CRUD handlers ────

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          name: newName,
        }),
      });
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setShowForm(false);
      fetchUsers();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!resetPassword || resetPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    try {
      await apiFetch(`/users/${userId}/password`, {
        method: "PUT",
        body: JSON.stringify({ password: resetPassword }),
      });
      setResetUserId(null);
      setResetPassword("");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset password");
    }
  };

  const handleArchive = async (userId: string, email: string) => {
    if (
      !window.confirm(
        `Archive user "${email}"? They will no longer be able to log in.`,
      )
    )
      return;
    try {
      await apiFetch(`/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "archived" }),
      });
      fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive user");
    }
  };

  const handleRestore = async (userId: string) => {
    try {
      await apiFetch(`/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "active" }),
      });
      fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restore user");
    }
  };

  // ──── Settings save ────
  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsError(null);
    setSettingsSaved(false);
    try {
      await apiFetch("/settings", {
        method: "PUT",
        body: JSON.stringify({ site_title: siteTitle }),
      });
      setSettingsSaved(true);
      refreshSettings();
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (e) {
      setSettingsError(
        e instanceof Error ? e.message : "Failed to save settings",
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  const filteredUsers = showArchived
    ? users
    : users.filter((u) => u.status !== "archived");

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "users", label: "User Management" },
    { key: "app", label: "App Settings" },
  ];

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Back to maps"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{currentUser?.email}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl gap-0 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* ──── USER MANAGEMENT TAB ──── */}
        {activeTab === "users" && (
          <>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 font-medium underline"
                >
                  dismiss
                </button>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-medium text-gray-800">Users</h2>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Show archived
                </label>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} />
                Add User
              </button>
            </div>

            {/* New user form */}
            {showForm && (
              <form
                onSubmit={handleCreate}
                className="mb-6 rounded-xl border border-gray-200 bg-white p-4"
              >
                <h3 className="mb-3 text-sm font-medium text-gray-700">
                  New User
                </h3>
                {formError && (
                  <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {formSubmitting ? "Creating…" : "Create User"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {loading && (
              <div className="py-12 text-center text-gray-400">
                <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" />
              </div>
            )}

            {!loading && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 font-medium text-gray-600">
                        Email
                      </th>
                      <th className="px-4 py-2.5 font-medium text-gray-600">
                        Name
                      </th>
                      <th className="px-4 py-2.5 font-medium text-gray-600">
                        Status
                      </th>
                      <th className="px-4 py-2.5 font-medium text-gray-600">
                        Created
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className={
                          u.status === "archived" ? "bg-gray-50 opacity-60" : ""
                        }
                      >
                        <td className="px-4 py-3 text-gray-900">{u.email}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {u.name || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              u.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {u.status === "active" ? "Active" : "Archived"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {resetUserId === u.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="password"
                                  placeholder="New password"
                                  value={resetPassword}
                                  onChange={(e) =>
                                    setResetPassword(e.target.value)
                                  }
                                  className="w-36 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                />
                                <button
                                  onClick={() => handleResetPassword(u.id)}
                                  className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setResetUserId(null);
                                    setResetPassword("");
                                  }}
                                  className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => setResetUserId(u.id)}
                                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                  title="Reset password"
                                >
                                  <FontAwesomeIcon icon={faKey} />
                                </button>
                                {u.id !== currentUser?.id &&
                                  (u.status === "active" ? (
                                    <button
                                      onClick={() =>
                                        handleArchive(u.id, u.email)
                                      }
                                      className="rounded-md p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
                                      title="Archive user"
                                    >
                                      <FontAwesomeIcon icon={faBoxArchive} />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleRestore(u.id)}
                                      className="rounded-md p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                                      title="Restore user"
                                    >
                                      <FontAwesomeIcon icon={faRotateLeft} />
                                    </button>
                                  ))}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ──── APP SETTINGS TAB ──── */}
        {activeTab === "app" && (
          <>
            {settingsError && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {settingsError}
                <button
                  onClick={() => setSettingsError(null)}
                  className="ml-2 font-medium underline"
                >
                  dismiss
                </button>
              </div>
            )}

            {settingsLoading ? (
              <div className="py-12 text-center text-gray-400">
                <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" />
              </div>
            ) : (
              <form
                onSubmit={handleSaveSettings}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <h2 className="mb-4 text-lg font-medium text-gray-800">
                  App Settings
                </h2>
                <div className="max-w-md space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Site Title
                    </label>
                    <input
                      type="text"
                      value={siteTitle}
                      onChange={(e) => setSiteTitle(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="Your Map Tool Name"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Displayed in the app header and browser title
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={settingsSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {settingsSaving ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin />
                        Saving…
                      </>
                    ) : settingsSaved ? (
                      <>
                        <FontAwesomeIcon icon={faCheck} />
                        Saved
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
