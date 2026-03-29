  
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Plus, Loader2, AlertCircle, CheckCircle,
  GripVertical, Trash2, Save, Edit3, Globe, Users, LayoutGrid,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { customColumnService } from '../../services/customcolumnService';

const FIELD_TYPES = ['text', 'number', 'date', 'email', 'phone', 'file', 'select'];

const SCOPE_CONFIG = {
  ext:  { label: 'External', activeClass: 'bg-blue-50 text-blue-700 border-blue-200',      icon: <Globe className="h-3 w-3" />      },
  int:  { label: 'Internal', activeClass: 'bg-green-50 text-green-700 border-green-200',   icon: <Users className="h-3 w-3" />      },
  both: { label: 'Both',     activeClass: 'bg-purple-50 text-purple-700 border-purple-200', icon: <LayoutGrid className="h-3 w-3" /> },
};

const SECTION_ICONS = ['📋', '💼', '🪪', '📁', '📝', '📌', '🗂️', '🔗'];

function ScopeToggle({ value, onChange }) {
  return (
    <div className="flex border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
      {Object.entries(SCOPE_CONFIG).map(([key, cfg]) => (
        <button key={key} onClick={() => onChange(key)}
          className={`px-2.5 py-1 text-[10px] flex items-center gap-1 font-medium transition-all
            ${value === key ? cfg.activeClass : 'bg-white text-gray-400 hover:bg-gray-50'}
            ${key !== 'ext' ? 'border-l border-gray-200' : ''}`}>
          {cfg.icon} {cfg.label}
        </button>
      ))}
    </div>
  );
}

function FieldRow({ field, sectionId, onUpdate, onDelete, onDragStart, onDragEnter, onDragEnd, onDragOver, isDragging, isDragOver }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(sectionId, field.id)}
      onDragEnter={() => onDragEnter(sectionId, field.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      className={`flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 group/field transition-all
        ${isDragging ? 'opacity-30' : ''}
        ${isDragOver ? 'border-t-2 border-t-indigo-400' : ''}`}
    >
      <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0">
        <GripVertical className="h-4 w-4" />
      </div>
      <input
        className="flex-1 text-sm text-gray-800 border-none outline-none bg-transparent placeholder-gray-300 min-w-0"
        value={field.label}
        placeholder="Field name"
        onChange={(e) => onUpdate(sectionId, field.id, 'label', e.target.value)}
      />
      <select
        value={field.type}
        onChange={(e) => onUpdate(sectionId, field.id, 'type', e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-500 bg-white outline-none focus:ring-1 focus:ring-indigo-400 flex-shrink-0"
      >
        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <ScopeToggle value={field.scope} onChange={(v) => onUpdate(sectionId, field.id, 'scope', v)} />
      <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer flex-shrink-0 whitespace-nowrap">
        <input type="checkbox" checked={field.required}
          onChange={(e) => onUpdate(sectionId, field.id, 'required', e.target.checked)}
          className="accent-indigo-600 w-3.5 h-3.5" />
        Req.
      </label>
      <button onClick={() => onDelete(sectionId, field.id)}
        className="opacity-0 group-hover/field:opacity-100 h-6 w-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SectionCard({
  section, onUpdateSection, onDeleteSection, onAddField, onUpdateField, onDeleteField,
  onSectionDragStart, onSectionDragEnter, onSectionDragEnd, onSectionDragOver,
  isSectionDragging, isSectionDragOver,
  dragFieldState, onFieldDragStart, onFieldDragEnter, onFieldDragEnd, onFieldDragOver,
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div
      draggable
      onDragStart={() => onSectionDragStart(section.id)}
      onDragEnter={() => onSectionDragEnter(section.id)}
      onDragEnd={onSectionDragEnd}
      onDragOver={(e) => { e.preventDefault(); onSectionDragOver(); }}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all
        ${isSectionDragging ? 'opacity-30 scale-95' : ''}
        ${isSectionDragOver ? 'border-t-4 border-t-indigo-400' : ''}`}
    >
      <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50/80 border-b border-gray-100">
        <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
          <GripVertical className="h-4 w-4" />
        </div>
        <button
          onClick={() => {
            const idx = SECTION_ICONS.indexOf(section.icon);
            onUpdateSection(section.id, 'icon', SECTION_ICONS[(idx + 1) % SECTION_ICONS.length]);
          }}
          className="text-base flex-shrink-0 hover:scale-110 transition-transform"
        >
          {section.icon}
        </button>
        <input
          className="flex-1 text-sm font-semibold text-gray-800 bg-transparent border-none outline-none placeholder-gray-300"
          value={section.name}
          placeholder="Section name"
          onChange={(e) => onUpdateSection(section.id, 'name', e.target.value)}
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-300">{section.fields.length} fields</span>
          <button onClick={() => setCollapsed((c) => !c)}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
            {collapsed ? 'Show' : 'Hide'}
          </button>
          <button onClick={() => onDeleteSection(section.id)}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="px-5 pt-1 pb-2">
          {section.fields.length === 0 && (
            <p className="text-xs text-gray-300 py-3 text-center">No fields yet. Add one below.</p>
          )}
          {section.fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              sectionId={section.id}
              onUpdate={onUpdateField}
              onDelete={onDeleteField}
              onDragStart={onFieldDragStart}
              onDragEnter={onFieldDragEnter}
              onDragEnd={onFieldDragEnd}
              onDragOver={onFieldDragOver}
              isDragging={dragFieldState.srcSection === section.id && dragFieldState.srcField === field.id}
              isDragOver={dragFieldState.overSection === section.id && dragFieldState.overField === field.id}
            />
          ))}
          <button onClick={() => onAddField(section.id)}
            className="flex items-center gap-1.5 mt-1 text-xs text-indigo-500 hover:text-indigo-700 py-2 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add field
          </button>
        </div>
      )}
    </div>
  );
}

let _id = 1;
const tempId = () => `tmp_${_id++}`;

// Sort by order before grouping so section + field order is preserved
function groupIntoSections(columns) {
  const sorted = [...columns].sort((a, b) => a.order - b.order);
  const sectionMap = {};
  const sectionOrder = [];
  sorted.forEach((col) => {
    const sec = col.section || 'General';
    if (!sectionMap[sec]) {
      sectionMap[sec] = {
        id: `sec_${sec}`,
        name: sec,
        icon: SECTION_ICONS[sectionOrder.length % SECTION_ICONS.length],
        fields: [],
      };
      sectionOrder.push(sec);
    }
    sectionMap[sec].fields.push({
      id: col.id,
      label: col.label,
      field_key: col.field_key,
      type: col.type,
      scope: col.scope || 'both',
      required: col.required || false,
      is_fixed: col.is_fixed || false,
      order: col.order,
    });
  });
  return sectionOrder.map((s) => sectionMap[s]);
}

// Assign global order across ALL sections so profile page sorts correctly
function flattenSections(sections) {
  const result = [];
  let globalOrder = 0;
  sections.forEach((sec) => {
    sec.fields.forEach((field) => {
      result.push({
        id: field.id,
        section: sec.name,
        label: field.label,
        field_key: field.field_key || field.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        type: field.type,
        scope: field.scope,
        required: field.required,
        is_fixed: field.is_fixed,
        order: globalOrder++,  // global order so sorting across sections works
      });
    });
  });
  return result;
}

export default function SchemaEditorPage() {
  const { page }  = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();

  const tableLabel = location.state?.label || page;

  const [sections,     setSections]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [hasChanges,   setHasChanges]   = useState(false);
  const [previewScope, setPreviewScope] = useState('both');
  const [toast,        setToast]        = useState(null);

  const dragSection = useRef(null);
  const [sectionDragState, setSectionDragState] = useState({ src: null, over: null });
  const dragField = useRef({ srcSection: null, srcField: null });
  const [fieldDragState, setFieldDragState] = useState({ srcSection: null, srcField: null, overSection: null, overField: null });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const markChanged = () => setHasChanges(true);

  const loadColumns = useCallback(async () => {
    try {
      setLoading(true);
      const columns = await customColumnService.getByPage(page);
      setSections(groupIntoSections(columns));
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadColumns(); }, [loadColumns]);

  // ── Section drag ──────────────────────────────────────────────────────────
  const handleSectionDragStart = (sid) => {
    dragSection.current = sid;
    setSectionDragState({ src: sid, over: null });
  };
  const handleSectionDragEnter = (sid) => {
    if (dragSection.current === sid) return;
    setSectionDragState((s) => ({ ...s, over: sid }));
  };
  const handleSectionDragOver = () => {};
  const handleSectionDragEnd = () => {
    const src  = dragSection.current;
    const over = sectionDragState.over;
    if (src && over && src !== over) {
      setSections((prev) => {
        const next = [...prev];
        const from = next.findIndex((s) => s.id === src);
        const to   = next.findIndex((s) => s.id === over);
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
      markChanged();
    }
    dragSection.current = null;
    setSectionDragState({ src: null, over: null });
  };

  // ── Field drag ────────────────────────────────────────────────────────────
  const handleFieldDragStart = (secId, fieldId) => {
    dragField.current = { srcSection: secId, srcField: fieldId };
    setFieldDragState({ srcSection: secId, srcField: fieldId, overSection: null, overField: null });
  };
  const handleFieldDragEnter = (secId, fieldId) => {
    if (dragField.current.srcField === fieldId) return;
    setFieldDragState((s) => ({ ...s, overSection: secId, overField: fieldId }));
  };
  const handleFieldDragOver = () => {};
  const handleFieldDragEnd = () => {
    const { srcSection, srcField } = dragField.current;
    const { overSection, overField } = fieldDragState;
    if (srcField && overField && srcField !== overField) {
      setSections((prev) => {
        const next = prev.map((s) => ({ ...s, fields: [...s.fields] }));
        const srcSec  = next.find((s) => s.id === srcSection);
        const overSec = next.find((s) => s.id === overSection);
        if (!srcSec || !overSec) return prev;
        const fromIdx = srcSec.fields.findIndex((f) => f.id === srcField);
        const [moved] = srcSec.fields.splice(fromIdx, 1);
        const toIdx   = overSec.fields.findIndex((f) => f.id === overField);
        overSec.fields.splice(toIdx, 0, moved);
        return next;
      });
      markChanged();
    }
    dragField.current = { srcSection: null, srcField: null };
    setFieldDragState({ srcSection: null, srcField: null, overSection: null, overField: null });
  };

  // ── Section CRUD ──────────────────────────────────────────────────────────
  const addSection = () => {
    setSections((s) => [...s, { id: tempId(), name: 'New section', icon: SECTION_ICONS[s.length % SECTION_ICONS.length], fields: [] }]);
    markChanged();
  };
  const updateSection = (sid, key, val) => {
    setSections((s) => s.map((sec) => sec.id === sid ? { ...sec, [key]: val } : sec));
    markChanged();
  };
  const deleteSection = (sid) => {
    if (!confirm('Delete this section and all its fields?')) return;
    setSections((s) => s.filter((sec) => sec.id !== sid));
    markChanged();
  };

  // ── Field CRUD ────────────────────────────────────────────────────────────
  const addField = (sid) => {
    setSections((s) => s.map((sec) => sec.id === sid
      ? { ...sec, fields: [...sec.fields, { id: tempId(), label: 'New field', type: 'text', scope: 'both', required: false, is_fixed: false }] }
      : sec));
    markChanged();
  };
  const updateField = (sid, fid, key, val) => {
    setSections((s) => s.map((sec) => sec.id === sid
      ? { ...sec, fields: sec.fields.map((f) => f.id === fid ? { ...f, [key]: val } : f) }
      : sec));
    markChanged();
  };
  const deleteField = (sid, fid) => {
    setSections((s) => s.map((sec) => sec.id === sid
      ? { ...sec, fields: sec.fields.filter((f) => f.id !== fid) }
      : sec));
    markChanged();
  };

  // ── Save — assigns global order so profile page reflects correct sequence ─
  const handleSave = async () => {
    try {
      setSaving(true);
      const flat = flattenSections(sections);
      await Promise.all(flat.map((col) =>
        String(col.id).startsWith('tmp_')
          ? customColumnService.create({ ...col, page })
          : customColumnService.update(col.id, col)
      ));
      showToast('success', 'Schema saved! Changes will reflect on employee pages.');
      setHasChanges(false);
      loadColumns();
    } catch (e) {
      showToast('error', e?.response?.data?.message || 'Failed to save schema.');
    } finally {
      setSaving(false);
    }
  };

  const visibleSections = sections.map((sec) => ({
    ...sec,
    fields: previewScope === 'both' ? sec.fields : sec.fields.filter((f) => f.scope === previewScope || f.scope === 'both'),
  })).filter((sec) => sec.fields.length > 0 || previewScope === 'both');

  const displayedSections = previewScope === 'both' ? sections : visibleSections;

  return (
    <DashboardLayout>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2
          ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-400" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/manage-columns')}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <span className="text-gray-200">/</span>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-900">{tableLabel}</h1>
              {hasChanges && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1">
              {[
                { value: 'both', label: 'All',      icon: <LayoutGrid className="h-3 w-3" /> },
                { value: 'ext',  label: 'External', icon: <Globe className="h-3 w-3" />      },
                { value: 'int',  label: 'Internal', icon: <Users className="h-3 w-3" />      },
              ].map((tab) => (
                <button key={tab.value} onClick={() => setPreviewScope(tab.value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${previewScope === tab.value ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save schema
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 rounded-xl text-xs text-gray-400 border border-gray-100">
          <span className="w-4" /><span className="w-4" />
          <span className="flex-1 font-medium">Field name</span>
          <span className="w-20 text-center">Type</span>
          <span className="w-44 text-center">Scope</span>
          <span className="w-12 text-center">Req.</span>
          <span className="w-6" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-300">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading schema...
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayedSections.map((sec) => (
                <SectionCard
                  key={sec.id}
                  section={sec}
                  onUpdateSection={updateSection}
                  onDeleteSection={deleteSection}
                  onAddField={addField}
                  onUpdateField={updateField}
                  onDeleteField={deleteField}
                  onSectionDragStart={handleSectionDragStart}
                  onSectionDragEnter={handleSectionDragEnter}
                  onSectionDragEnd={handleSectionDragEnd}
                  onSectionDragOver={handleSectionDragOver}
                  isSectionDragging={sectionDragState.src === sec.id}
                  isSectionDragOver={sectionDragState.over === sec.id}
                  dragFieldState={fieldDragState}
                  onFieldDragStart={handleFieldDragStart}
                  onFieldDragEnter={handleFieldDragEnter}
                  onFieldDragEnd={handleFieldDragEnd}
                  onFieldDragOver={handleFieldDragOver}
                />
              ))}
              {sections.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300 bg-white rounded-2xl border border-gray-100">
                  <Edit3 className="h-8 w-8 mb-2" />
                  <p className="text-sm">No sections yet. Add your first section below.</p>
                </div>
              )}
            </div>

            <button onClick={addSection}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-500 border border-dashed border-gray-200 rounded-xl hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all w-full justify-center">
              <Plus className="h-4 w-4" /> Add section
            </button>

            <div className="flex items-center justify-between pt-2 pb-6">
              <p className="text-xs text-gray-300">
                Each field independently controls its visibility on External and Internal pages.
              </p>
              <button onClick={handleSave} disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save schema
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
