import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSpinner,
  faCopy,
  faBoxArchive,
  faTrash,
  faArrowUpRightFromSquare,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import {
  listMaps,
  createMap,
  duplicateMap,
  updateMap,
  deleteMap,
  type MapSummary,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import sunIcon from "../assets/colorado-sun-icon.svg";

type StatusFilter = "active" | "draft" | "published" | "archived" | "all";

export default function IndexPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = statusFilter === "active" ? undefined : statusFilter;
      const result = await listMaps(filter);
      setMaps(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load maps");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const handleCreate = async () => {
    try {
      const { id } = await createMap({ title: "Untitled Map" });
      navigate(`/maps/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create map");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateMap(id);
      fetchMaps();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to duplicate map");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await updateMap(id, { status: "archived" });
      fetchMaps();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive map");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`))
      return;
    try {
      await deleteMap(id);
      fetchMaps();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete map");
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-yellow-100 text-yellow-800",
      published: "bg-green-100 text-green-800",
      archived: "bg-gray-100 text-gray-500",
    };
    return (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <img src={sunIcon} alt="" className="h-7 w-7" />
            {settings.site_title}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/settings")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              title="Settings"
            >
              <FontAwesomeIcon icon={faGear} />
              Settings
            </button>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} />
              New Map
            </button>
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Filter tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
          {(["active", "draft", "published", "archived", "all"] as StatusFilter[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === f
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            )
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-12 text-center text-gray-400">
            <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" />
          </div>
        )}

        {/* Empty state */}
        {!loading && maps.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500 mb-4">No maps yet.</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faPlus} />
              Create your first map
            </button>
          </div>
        )}

        {/* Map grid */}
        {!loading && maps.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {maps.map((m) => (
              <div
                key={m.id}
                className="group rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                {/* Clickable card body */}
                <button
                  onClick={() => navigate(`/maps/${m.id}`)}
                  className="mb-3 block w-full text-left"
                >
                  <div className="flex items-start justify-between">
                    <h2 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {m.title}
                    </h2>
                    {statusBadge(m.status)}
                  </div>
                  {m.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {m.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    Updated{" "}
                    {new Date(m.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </button>

                {/* Action buttons */}
                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => navigate(`/maps/${m.id}`)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Open in editor"
                  >
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                    Open
                  </button>
                  <button
                    onClick={() => handleDuplicate(m.id)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Duplicate"
                  >
                    <FontAwesomeIcon icon={faCopy} />
                    Duplicate
                  </button>
                  {m.status !== "archived" && (
                    <button
                      onClick={() => handleArchive(m.id)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      title="Archive"
                    >
                      <FontAwesomeIcon icon={faBoxArchive} />
                      Archive
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(m.id, m.title)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete permanently"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
