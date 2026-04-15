import { useState, useEffect, useRef } from "react";
import apiClient from '../../api/axios';

// ─── tiny drag-and-drop helpers ──────────────────────────────────────────────
function useDragList(items, onReorder) {
  const dragIdx = useRef(null);

  const onDragStart = (i) => { dragIdx.current = i; };
  const onDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    onReorder(next);
  };
  const onDrop = () => { dragIdx.current = null; };

  return { onDragStart, onDragOver, onDrop };
}

const FIELD_TYPES = ["text","number","email","phone","date","select","textarea"];

// ─── HR Actions special keys ──────────────────────────────────────────────────
const HR_SECTION       = "HR Actions";
const HR_TAB_KEY       = "__tab_hr_actions";
const HR_ACTION_KEYS   = ["__action_memo", "__action_ir", "__action_loa"];

// ─────────────────────────────────────────────────────────────────────────────
export default function ManageColumnsModal({ page, onClose, onSaved }) {
  const [sections,    setSections]    = useState([]);   // [{name, fields:[]}]
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [error,       setError]       = useState("");

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
   apiClient.get("/custom-columns", { params: { page } })
      .then(({ data }) => {
        // group by section, preserve order
        const map = {};
        const order = [];
        (data.data ?? data).forEach(col => {
          if (!map[col.section]) { map[col.section] = []; order.push(col.section); }
          map[col.section].push({ ...col, _dirty: false });
        });
        const built = order.map(name => ({
          name,
          _origName: name,
          fields: map[name].sort((a,b) => a.order - b.order),
        }));
        setSections(built);
        setActiveSection(built[0]?.name ?? null);
      })
      .catch(() => setError("Failed to load columns."))
      .finally(() => setLoading(false));
  }, [page]);

  // ── section drag ──────────────────────────────────────────────────────────
  const sectionDrag = useDragList(sections, setSections);

  // ── helpers ───────────────────────────────────────────────────────────────
  const isHRSection = (name) => name === HR_SECTION;

  const updateSection = (idx, patch) =>
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const updateField = (sIdx, fIdx, patch) =>
    setSections(prev => prev.map((s, i) =>
      i !== sIdx ? s : {
        ...s,
        fields: s.fields.map((f, j) => j !== fIdx ? f : { ...f, ...patch, _dirty: true })
      }
    ));

  const addSection = () => {
    const name = `New Section ${sections.length + 1}`;
    setSections(prev => [...prev, { name, _origName: null, fields: [] }]);
    setActiveSection(name);
  };

  const deleteSection = (idx) => {
    const s = sections[idx];
    if (s.fields.some(f => f.is_fixed)) {
      alert("Cannot delete a section that contains fixed fields.");
      return;
    }
    setSections(prev => prev.filter((_, i) => i !== idx));
    setActiveSection(sections[idx - 1]?.name ?? sections[idx + 1]?.name ?? null);
  };

  const addField = (sIdx) => {
    setSections(prev => prev.map((s, i) =>
      i !== sIdx ? s : {
        ...s,
        fields: [...s.fields, {
          id: null,
          field_key: `custom_${Date.now()}`,
          label: "New Field",
          type: "text",
          options: null,
          required: 0,
          is_fixed: 0,
          order: s.fields.length,
          _dirty: true,
          _new: true,
        }]
      }
    ));
  };

  const deleteField = (sIdx, fIdx) => {
    setSections(prev => prev.map((s, i) =>
      i !== sIdx ? s : { ...s, fields: s.fields.filter((_, j) => j !== fIdx) }
    ));
  };

  // field drag within a section
  const makeFieldDrag = (sIdx) => {
    const fields = sections[sIdx]?.fields ?? [];
    return useDragList(fields, (reordered) =>   // eslint-disable-line react-hooks/rules-of-hooks
      setSections(prev => prev.map((s, i) => i !== sIdx ? s : { ...s, fields: reordered }))
    );
  };

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      // build payload: flatten all sections/fields with updated order + section name
      const payload = sections.flatMap((sec, sIdx) =>
        sec.fields.map((f, fIdx) => ({
          id:         f.id,
          page,
          section:    sec.name,
          field_key:  f.field_key,
          label:      f.label,
          type:       f.type,
          options:    f.options,
          required:   f.required,
          is_fixed:   f.is_fixed,
          order:      fIdx,
          section_order: sIdx,
          _delete:    f._delete ?? false,
        }))
      );
      await apiClient.post("/custom-columns/batch", { page, columns: payload })
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  const activeSIdx = sections.findIndex(s => s.name === activeSection);
  const activeS    = sections[activeSIdx];

  if (loading) return (
    <ModalShell onClose={onClose} title="Manage Columns">
      <p className="text-center py-10 text-gray-500">Loading…</p>
    </ModalShell>
  );

  return (
    <ModalShell onClose={onClose} title={`Manage Columns — ${page.replace("_"," ")}`} wide>
      {error && <p className="text-red-600 text-sm mb-2 px-4">{error}</p>}

      <div className="flex h-[520px]">
        {/* ── Left: section list ── */}
        <aside className="w-48 border-r flex flex-col bg-gray-50">
          <div className="flex-1 overflow-y-auto">
            {sections.map((sec, sIdx) => (
              <div
                key={sIdx}
                draggable
                onDragStart={() => sectionDrag.onDragStart(sIdx)}
                onDragOver={(e) => sectionDrag.onDragOver(e, sIdx)}
                onDrop={sectionDrag.onDrop}
                className={`group flex items-center gap-1 px-3 py-2 cursor-pointer text-sm border-b
                  ${sec.name === activeSection ? "bg-white font-semibold text-blue-600 border-l-2 border-l-blue-600" : "hover:bg-gray-100"}`}
                onClick={() => setActiveSection(sec.name)}
              >
                <span className="text-gray-300 cursor-grab mr-1">⠿</span>
                <span className="flex-1 truncate">{sec.name}</span>
                {!isHRSection(sec.name) && (
                  <button
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs"
                    onClick={(e) => { e.stopPropagation(); deleteSection(sIdx); }}
                    title="Delete section"
                  >✕</button>
                )}
              </div>
            ))}
          </div>
          <button
            className="m-2 text-xs border rounded px-2 py-1 hover:bg-gray-100 text-blue-600"
            onClick={addSection}
          >+ Add Section</button>
        </aside>

        {/* ── Right: fields ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!activeS ? (
            <p className="m-auto text-gray-400 text-sm">Select a section</p>
          ) : (
            <>
              {/* section name / HR tab name editable header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
                {isHRSection(activeS.name) ? (
                  <HRTabNameEditor
                    fields={activeS.fields}
                    onChange={(fIdx, label) => updateField(activeSIdx, fIdx, { label })}
                  />
                ) : (
                  <>
                    <span className="text-xs text-gray-400">Section name:</span>
                    <input
                      className="border rounded px-2 py-0.5 text-sm flex-1"
                      value={activeS.name}
                      onChange={e => updateSection(activeSIdx, { name: e.target.value })}
                    />
                  </>
                )}
              </div>

              {/* field rows */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                <FieldList
                  section={activeS}
                  sIdx={activeSIdx}
                  updateField={updateField}
                  deleteField={deleteField}
                  setSections={setSections}
                  isHRSection={isHRSection(activeS.name)}
                />
              </div>

              {!isHRSection(activeS.name) && (
                <div className="border-t px-4 py-2">
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => addField(activeSIdx)}
                  >+ Add Field</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* footer */}
      <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50">
        <button
          className="px-4 py-1.5 text-sm rounded border hover:bg-gray-100"
          onClick={onClose}
        >Cancel</button>
        <button
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >{saving ? "Saving…" : "Save Changes"}</button>
      </div>
    </ModalShell>
  );
}

// ─── HR Tab Name Editor (read-only fields except label of __tab_hr_actions + action names) ──
function HRTabNameEditor({ fields, onChange }) {
  const tabField    = fields.find(f => f.field_key === HR_TAB_KEY);
  const tabIdx      = fields.findIndex(f => f.field_key === HR_TAB_KEY);
  const actionFields = HR_ACTION_KEYS.map(key => ({
    field: fields.find(f => f.field_key === key),
    fIdx:  fields.findIndex(f => f.field_key === key),
    key,
  }));

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-24">Tab label:</span>
        <input
          className="border rounded px-2 py-0.5 text-sm flex-1"
          value={tabField?.label ?? "HR Actions"}
          onChange={e => onChange(tabIdx, e.target.value)}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">Action type labels:</p>
      {actionFields.map(({ field, fIdx, key }) => (
        field ? (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-24 truncate">{key.replace("__action_","")}</span>
            <input
              className="border rounded px-2 py-0.5 text-sm flex-1"
              value={field.label}
              onChange={e => onChange(fIdx, e.target.value)}
            />
          </div>
        ) : null
      ))}
    </div>
  );
}

// ─── FieldList ────────────────────────────────────────────────────────────────
function FieldList({ section, sIdx, updateField, deleteField, setSections, isHRSection }) {
  const dragIdx = useRef(null);

  const onDragStart = (i) => { dragIdx.current = i; };
  const onDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...section.fields];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setSections(prev => prev.map((s, si) => si !== sIdx ? s : { ...s, fields: next }));
  };
  const onDrop = () => { dragIdx.current = null; };

  const visibleFields = isHRSection
    ? section.fields.filter(f => !HR_ACTION_KEYS.includes(f.field_key) && f.field_key !== HR_TAB_KEY)
    : section.fields;

  if (visibleFields.length === 0)
    return <p className="text-gray-400 text-xs py-4 text-center">No fields yet. Add one below.</p>;

  return visibleFields.map((field, fIdx) => (
    <div
      key={field.id ?? field.field_key}
      draggable
      onDragStart={() => onDragStart(fIdx)}
      onDragOver={(e) => onDragOver(e, fIdx)}
      onDrop={onDrop}
      className="flex items-center gap-2 border rounded px-2 py-1.5 bg-white hover:bg-gray-50 text-sm"
    >
      <span className="text-gray-300 cursor-grab">⠿</span>

      {/* label */}
      <input
        className="flex-1 border-b border-transparent focus:border-blue-400 outline-none text-sm"
        value={field.label}
        onChange={e => updateField(sIdx, fIdx, { label: e.target.value })}
      />

      {/* type */}
      <select
        className="border rounded px-1 py-0.5 text-xs"
        value={field.type}
        onChange={e => updateField(sIdx, fIdx, { type: e.target.value })}
      >
        {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* required toggle */}
      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
        <input
          type="checkbox"
          checked={!!field.required}
          onChange={e => updateField(sIdx, fIdx, { required: e.target.checked ? 1 : 0 })}
        />
        Req
      </label>

      {/* fixed badge */}
      {field.is_fixed
        ? <span className="text-xs bg-gray-100 text-gray-400 rounded px-1">fixed</span>
        : (
          <button
            className="text-red-400 hover:text-red-600 text-xs px-1"
            onClick={() => deleteField(sIdx, fIdx)}
            title="Delete field"
          >✕</button>
        )
      }
    </div>
  ));
}

// ─── ModalShell ───────────────────────────────────────────────────────────────
function ModalShell({ children, onClose, title, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`bg-white rounded-xl shadow-2xl flex flex-col ${wide ? "w-[780px]" : "w-96"} max-h-[90vh]`}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-700">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}