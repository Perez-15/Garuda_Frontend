import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Filter, ChevronDown, X, Save,
  AlertCircle, Edit2, Trash2, Building2, Phone,
  Mail, MapPin, User, MessageSquare, Settings2,
  Users, TrendingUp, Clock, CheckCircle,
} from "lucide-react";
import apiClient from "../../api/axios";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ManageColumnsModal from "../../components/Modal/ManageColumnsModal";
import { useAuth } from "../../contexts/AuthContext";

const PAGE_KEY = "client_prospects";

const STATUS_OPTIONS = [
  { value: "sent_email",       label: "Sent Email",          color: "bg-blue-100 text-blue-700" },
  { value: "updated",          label: "Updated",             color: "bg-green-100 text-green-700" },
  { value: "they_emailed",     label: "They Emailed",        color: "bg-purple-100 text-purple-700" },
  { value: "hard_copy_needed", label: "Hard Copy Needed",    color: "bg-orange-100 text-orange-700" },
  { value: "no_response",      label: "No Response",         color: "bg-gray-100 text-gray-600" },
  { value: "after_1_month",    label: "Follow Up (1 Month)", color: "bg-yellow-100 text-yellow-700" },
  { value: "email_back",       label: "Email Back",          color: "bg-teal-100 text-teal-700" },
  { value: "for_follow_up",    label: "For Follow Up",       color: "bg-red-100 text-red-700" },
];

const DEFAULT_COLUMNS = [
  { field_key: "company_name",     label: "Company Name",     type: "text",     section: "Company Info", order: 1, required: true  },
  { field_key: "phone_number",     label: "Phone Number",     type: "text",     section: "Company Info", order: 2, required: false },
  { field_key: "telephone_number", label: "Telephone Number", type: "text",     section: "Company Info", order: 3, required: false },
  { field_key: "contact_person",   label: "Contact Person",   type: "text",     section: "Contact",      order: 4, required: false },
  { field_key: "email_address",    label: "Email Address",    type: "email",    section: "Contact",      order: 5, required: false },
  { field_key: "location",         label: "Location",         type: "textarea", section: "Contact",      order: 6, required: false },
  { field_key: "status",           label: "Status",           type: "select",   section: "Status",       order: 7, required: false },
  { field_key: "remarks",          label: "Remarks",          type: "textarea", section: "Status",       order: 8, required: false },
];

const EMPTY_FORM = {
  company_name: "", phone_number: "", telephone_number: "",
  contact_person: "", email_address: "", location: "",
  status: "", remarks: "",
};

// ─────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────
function StatusBadge({ value }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === value);
  if (!opt) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>
      {opt.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// Marketing Employee Summary Cards (Admin only)
// ─────────────────────────────────────────────
    function MarketingSummary({ prospects, marketingUsers, onFilterByUser }) {
    if (marketingUsers.length === 0) return null;

    return (
        <div className="space-y-3">
        <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">Marketing Team Overview</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {marketingUsers.map((mu) => {
            const userProspects = prospects.filter((p) => p.created_by === mu.id);
            const active    = userProspects.filter((p) => ["sent_email", "email_back", "for_follow_up"].includes(p.status)).length;
            const noResp    = userProspects.filter((p) => p.status === "no_response").length;
            const updated   = userProspects.filter((p) => p.status === "updated").length;
            const lastEntry = userProspects[0];

            return (
                <div key={mu.id}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
                onClick={() => onFilterByUser(mu.id)}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 text-xs font-bold">
                        {mu.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{mu.name}</p>
                        <p className="text-xs text-gray-400">Marketing</p>
                    </div>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{userProspects.length}</span>
                </div>

                {/* Status breakdown */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center bg-blue-50 rounded-lg py-1.5">
                    <p className="text-xs text-blue-600 font-semibold">{active}</p>
                    <p className="text-[10px] text-blue-400">Active</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-lg py-1.5">
                    <p className="text-xs text-gray-600 font-semibold">{noResp}</p>
                    <p className="text-[10px] text-gray-400">No Reply</p>
                    </div>
                    <div className="text-center bg-green-50 rounded-lg py-1.5">
                    <p className="text-xs text-green-600 font-semibold">{updated}</p>
                    <p className="text-[10px] text-green-400">Updated</p>
                    </div>
                </div>

                {/* Status bar */}
                {userProspects.length > 0 && (
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                    {STATUS_OPTIONS.map((s) => {
                        const count = userProspects.filter((p) => p.status === s.value).length;
                        const pct   = (count / userProspects.length) * 100;
                        if (pct === 0) return null;
                        const barColor = {
                        sent_email:       "bg-blue-400",
                        updated:          "bg-green-400",
                        they_emailed:     "bg-purple-400",
                        hard_copy_needed: "bg-orange-400",
                        no_response:      "bg-gray-300",
                        after_1_month:    "bg-yellow-400",
                        email_back:       "bg-teal-400",
                        for_follow_up:    "bg-red-400",
                        }[s.value] || "bg-gray-200";
                        return (
                        <div key={s.value} className={`h-full ${barColor} rounded-full`}
                            style={{ width: `${pct}%` }} title={`${s.label}: ${count}`} />
                        );
                    })}
                    </div>
                )}

                {/* Last entry */}
                {lastEntry && (
                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last: {lastEntry.company_name} — {new Date(lastEntry.created_at).toLocaleDateString()}
                    </p>
                )}

                <p className="text-[10px] text-blue-500 mt-2 font-medium">Click to filter →</p>
                </div>
            );
            })}
        </div>
        </div>
    );
    }

// ─────────────────────────────────────────────
// Add / Edit Modal
// ─────────────────────────────────────────────
function ClientProspectModal({ prospect, columns, onClose, onSaved }) {
  const [form,   setForm]   = useState(prospect ? { ...prospect } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);
  const isEdit = !!prospect?.id;

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.company_name?.trim()) { setError("Company name is required."); return; }
    setSaving(true); setError(null);
    try {
      if (isEdit) {
        await apiClient.put(`/client-prospects/${prospect.id}`, form);
      } else {
        await apiClient.post("/client-prospects", form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const iconMap = {
    company_name:     <Building2     className="w-4 h-4 text-gray-400" />,
    phone_number:     <Phone         className="w-4 h-4 text-gray-400" />,
    telephone_number: <Phone         className="w-4 h-4 text-gray-400" />,
    contact_person:   <User          className="w-4 h-4 text-gray-400" />,
    email_address:    <Mail          className="w-4 h-4 text-gray-400" />,
    location:         <MapPin        className="w-4 h-4 text-gray-400" />,
    remarks:          <MessageSquare className="w-4 h-4 text-gray-400" />,
  };

  function renderField(col) {
    const icon     = iconMap[col.field_key];
    const base     = "w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";
    const withIcon = icon ? "pl-9" : "px-3";

    if (col.field_key === "status") {
      return (
        <div className="relative">
          <select name="status" value={form.status ?? ""} onChange={handleChange}
            className={`${base} px-3 py-2.5 appearance-none bg-white`}>
            <option value="">— Select status —</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      );
    }

    if (col.type === "select") {
      const opts = col.options ? col.options.split(",").map((o) => o.trim()) : [];
      return (
        <div className="relative">
          <select name={col.field_key} value={form[col.field_key] ?? ""} onChange={handleChange}
            className={`${base} px-3 py-2.5 appearance-none bg-white`}>
            <option value="">— Select —</option>
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      );
    }

    if (col.type === "textarea" || col.field_key === "location" || col.field_key === "remarks") {
      return (
        <div className="relative">
          {icon && <span className="absolute left-3 top-3">{icon}</span>}
          <textarea name={col.field_key} value={form[col.field_key] ?? ""} onChange={handleChange}
            rows={2} placeholder={col.label}
            className={`${base} ${withIcon} pr-4 py-2.5 resize-none`} />
        </div>
      );
    }

    return (
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
        <input name={col.field_key} value={form[col.field_key] ?? ""} onChange={handleChange}
          type={col.type === "email" ? "email" : col.type === "date" ? "date" : "text"}
          placeholder={col.label}
          className={`${base} ${withIcon} pr-4 py-2.5`} />
      </div>
    );
  }

  const sections = columns.reduce((acc, col) => {
    if (!acc[col.section]) acc[col.section] = [];
    acc[col.section].push(col);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? "Edit Client Prospect" : "Add New Client Prospect"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEdit ? "Update prospect details" : "Log a new potential client company"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          {Object.entries(sections).map(([sectionName, fields]) => (
            <div key={sectionName}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {sectionName}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map((col) => (
                  <div key={col.field_key}
                    className={col.type === "textarea" || col.field_key === "location" || col.field_key === "remarks" ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {col.label}
                      {col.required ? <span className="text-red-500 ml-0.5">*</span> : null}
                    </label>
                    {renderField(col)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : isEdit ? "Update" : "Add Prospect"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Delete Confirm Modal
// ─────────────────────────────────────────────
function DeleteProspectModal({ prospect, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    setDeleting(true);
    try {
      await apiClient.delete(`/client-prospects/${prospect.id}`);
      onDeleted();
    } catch { setDeleting(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-center text-lg font-semibold text-gray-900 mb-1">Delete Prospect</h3>
        <p className="text-center text-sm text-gray-500 mb-6">
          Are you sure you want to delete <strong>{prospect.company_name}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function ClientProspectsPage() {
  const { user } = useAuth();
  const userRole = user?.roles?.[0]?.name;
  const isAdmin  = userRole === "super_admin" || userRole === "hr_admin";
  const canManageColumns = isAdmin || userRole === "marketing";

  const [prospects,       setProspects]       = useState([]);
  const [allProspects,    setAllProspects]     = useState([]); // unfiltered, for summary cards
  const [columns,         setColumns]          = useState([]);
  const [marketingUsers,  setMarketingUsers]   = useState([]);
  const [loading,         setLoading]          = useState(true);
  const [search,          setSearch]           = useState("");
  const [statusFilter,    setStatusFilter]     = useState("");
  const [employeeFilter,  setEmployeeFilter]   = useState(""); // admin only
  const [showModal,       setShowModal]        = useState(false);
  const [editTarget,      setEditTarget]       = useState(null);
  const [deleteTarget,    setDeleteTarget]     = useState(null);
  const [showManageCols,  setShowManageCols]   = useState(false);
  const [showSummary,     setShowSummary]      = useState(true);

  // ── Fetch marketing users (admin only) ───────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    apiClient.get("/users", { params: { role: "marketing", per_page: 50 } })
      .then((res) => setMarketingUsers(res.data?.data?.data ?? res.data?.data ?? []))
      .catch(() => {});
  }, [isAdmin]);

  // ── Fetch all prospects unfiltered for summary cards ─────────────────────
  const fetchAllProspects = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await apiClient.get("/client-prospects");
      setAllProspects(res.data.data ?? res.data);
    } catch {}
  }, [isAdmin]);

  // ── Fetch columns ─────────────────────────────────────────────────────────
  const fetchColumns = useCallback(async () => {
    try {
      const res = await apiClient.get("/custom-columns", { params: { page: PAGE_KEY } });
      const fetched = res.data.data ?? res.data;
      setColumns(fetched.length > 0 ? fetched : DEFAULT_COLUMNS);
    } catch {
      setColumns(DEFAULT_COLUMNS);
    }
  }, []);

  // ── Fetch prospects (filtered) ────────────────────────────────────────────
  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)         params.search     = search;
      if (statusFilter)   params.status     = statusFilter;
      if (employeeFilter) params.created_by = employeeFilter;
      const res = await apiClient.get("/client-prospects", { params });
      setProspects(res.data.data ?? res.data);
    } catch (err) {
      console.error("Failed to fetch prospects:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, employeeFilter]);

  useEffect(() => { fetchColumns(); },      [fetchColumns]);
  useEffect(() => { fetchAllProspects(); }, [fetchAllProspects]);

  useEffect(() => {
    const delay = setTimeout(fetchProspects, 300);
    return () => clearTimeout(delay);
  }, [fetchProspects]);

  function handleSaved()     { setShowModal(false); setEditTarget(null); fetchProspects(); fetchAllProspects(); }
  function handleDeleted()   { setDeleteTarget(null); fetchProspects(); fetchAllProspects(); }
  function handleColsSaved() { setShowManageCols(false); fetchColumns(); }

  // When clicking a summary card, filter the table by that employee
  function handleFilterByUser(userId) {
    setEmployeeFilter((prev) => prev === String(userId) ? "" : String(userId));
    window.scrollTo({ top: 400, behavior: "smooth" });
  }

  const tableColumns      = [...columns].sort((a, b) => a.order - b.order);
  const activeEmployee    = marketingUsers.find((u) => String(u.id) === employeeFilter);

  function getCellValue(prospect, col) {
    if (col.field_key === "status") return <StatusBadge value={prospect.status} />;
    if (col.field_key === "email_address" && prospect.email_address) {
      return (
        <a href={`mailto:${prospect.email_address}`}
          className="text-blue-600 hover:underline truncate block max-w-[160px]">
          {prospect.email_address}
        </a>
      );
    }
    const val = prospect[col.field_key];
    if (!val) return <span className="text-gray-300">—</span>;
    return <span className="line-clamp-2">{val}</span>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Prospects</h1>
            <p className="text-gray-600">Track and manage potential client companies</p>
          </div>
          {isAdmin && marketingUsers.length > 0 && (
            <button onClick={() => setShowSummary((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Users className="w-4 h-4" />
              {showSummary ? "Hide" : "Show"} Team Overview
            </button>
          )}
        </div>

        {/* Marketing team summary (admin only) */}
        {isAdmin && showSummary && (
          <MarketingSummary
            prospects={allProspects}
            marketingUsers={marketingUsers}
            onFilterByUser={handleFilterByUser}
          />
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, contact, email..."
                className="w-full sm:w-64 pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white" />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white appearance-none">
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Employee filter — admin only */}
            {isAdmin && marketingUsers.length > 0 && (
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white appearance-none">
                  <option value="">All Employees</option>
                  {marketingUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canManageColumns && (
              <button onClick={() => setShowManageCols(true)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Settings2 className="w-4 h-4" />
                Manage Columns
              </button>
            )}
            <button onClick={() => { setEditTarget(null); setShowModal(true); }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              <Plus className="h-5 w-5 mr-2" />
              Add Prospect
            </button>
          </div>
        </div>

        {/* Active employee filter banner */}
        {activeEmployee && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
            <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              Showing prospects by <strong>{activeEmployee.name}</strong>
            </p>
            <button onClick={() => setEmployeeFilter("")}
              className="ml-auto text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
              <X className="w-3 h-3" /> Clear filter
            </button>
          </div>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Prospects", value: prospects.length,                                             color: "text-gray-900" },
            { label: "Sent Email",      value: prospects.filter((p) => p.status === "sent_email").length,    color: "text-blue-600" },
            { label: "No Response",     value: prospects.filter((p) => p.status === "no_response").length,   color: "text-gray-500" },
            { label: "For Follow Up",   value: prospects.filter((p) => p.status === "for_follow_up").length, color: "text-red-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      Added By
                    </th>
                  )}
                  {tableColumns.map((col) => (
                    <th key={col.field_key}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={tableColumns.length + (isAdmin ? 2 : 1)}
                      className="px-4 py-12 text-center text-gray-400 text-sm">
                      Loading prospects...
                    </td>
                  </tr>
                ) : prospects.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length + (isAdmin ? 2 : 1)} className="px-4 py-12 text-center">
                      <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No prospects found.</p>
                      <button onClick={() => { setEditTarget(null); setShowModal(true); }}
                        className="mt-3 text-blue-600 text-sm font-medium hover:underline">
                        Add your first prospect →
                      </button>
                    </td>
                  </tr>
                ) : (
                  prospects.map((prospect) => (
                    <tr key={prospect.id} className="hover:bg-gray-50/60 transition-colors">
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-700 text-[10px] font-bold">
                                {(prospect.creator?.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs text-gray-600 whitespace-nowrap">
                              {prospect.creator?.name || "—"}
                            </span>
                          </div>
                        </td>
                      )}
                      {tableColumns.map((col) => (
                        <td key={col.field_key} className="px-4 py-3 text-gray-600 max-w-[200px]">
                          {getCellValue(prospect, col)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditTarget(prospect); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button onClick={() => setDeleteTarget(prospect)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        {showModal && (
          <ClientProspectModal
            prospect={editTarget}
            columns={columns}
            onClose={() => { setShowModal(false); setEditTarget(null); }}
            onSaved={handleSaved}
          />
        )}
        {deleteTarget && (
          <DeleteProspectModal
            prospect={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={handleDeleted}
          />
        )}
        {showManageCols && (
          <ManageColumnsModal
            page={PAGE_KEY}
            onClose={() => setShowManageCols(false)}
            onSaved={handleColsSaved}
          />
        )}
      </div>
    </DashboardLayout>
  );
}