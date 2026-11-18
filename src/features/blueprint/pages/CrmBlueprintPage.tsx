import { useEffect, useMemo, useState, type FormEvent } from "react";
import "./crm-blueprint.css";

type ElementStatus = "pending" | "in_progress" | "completed";

type BlueprintPillar = {
  id: number;
  title: string;
  short: string;
  category: string;
  purpose: string;
  points: string[];
  elementStatuses: Record<string, ElementStatus>;
};

const STORAGE_KEY = "rockstar_crm_blueprint_v3";

const rawInitialPillars = [
  { id: 1, title: "Strategy", short: "Define the direction and purpose of the business.", category: "WHY", purpose: "Define why the business exists, where it wants to go and how it will achieve its long-term vision.", points: ["Vision", "Mission", "Core Values", "Objectives", "Strategic Priorities", "Business Operating Model Canvas – 15 Building Blocks", "Competitive Advantage", "Business Goals", "Annual Operating Plan"] },
  { id: 2, title: "Governance", short: "Establish authority, policies and control.", category: "CONTROL", purpose: "Establish the policies, responsibilities, authority and controls that guide how the business is managed.", points: ["Policies", "SOP Approval", "Authority Matrix", "Delegation of Authority", "Risk Management", "Compliance", "Audit", "Escalation Matrix"] },
  { id: 3, title: "Business Architecture", short: "Define what the business does and delivers.", category: "WHAT", purpose: "Describe the business model, value streams, capabilities and processes that create value for customers.", points: ["Business Model", "Value Streams", "Products", "Services", "Customers", "Functions", "Processes", "Capabilities"] },
  { id: 4, title: "Organization", short: "Define the structure and responsibilities.", category: "WHO", purpose: "Design the organization structure and clarify departments, teams, roles and accountability.", points: ["Organization Structure", "Departments", "Teams", "Roles", "Job Descriptions", "RACI", "Span of Control"] },
  { id: 5, title: "People", short: "Build and develop the workforce.", category: "WORKFORCE", purpose: "Attract, develop, engage and retain the people required to achieve business objectives.", points: ["Hiring", "Training", "Skills", "Competency Matrix", "Performance", "Rewards", "Career Path", "Culture"] },
  { id: 6, title: "Processes", short: "Define how work gets done.", category: "HOW", purpose: "Create consistent and measurable ways of working through documented processes and controls.", points: ["Process Maps", "SOPs", "Work Instructions", "Checklists", "Process Owners", "KPIs", "Inputs", "Outputs", "Controls"] },
  { id: 7, title: "Resources", short: "Manage the resources used by the business.", category: "WHAT WE USE", purpose: "Identify, allocate and manage the resources needed for effective business operations.", points: ["People", "Materials", "Machines", "Money", "Methods", "Information", "Facilities", "Suppliers"] },
  { id: 8, title: "Technology", short: "Enable the business through digital systems.", category: "AUTOMATION", purpose: "Use technology, digital systems and automation to improve business efficiency and decision-making.", points: ["ERP", "CRM", "HRMS", "WMS", "BI", "AI", "Workflow Automation", "Digital Forms", "Analytics"] },
  { id: 9, title: "Data & Information", short: "Turn business data into intelligence.", category: "INTELLIGENCE", purpose: "Manage reliable business information and convert data into useful insights for decisions.", points: ["Master Data", "Transaction Data", "Reports", "Dashboards", "Document Management", "Data Quality"] },
  { id: 10, title: "Performance Management", short: "Measure results and business performance.", category: "MEASURE", purpose: "Track business performance against objectives, targets and measurable outcomes.", points: ["OKR", "Targets", "Balanced Scorecard", "Dashboards", "Reviews", "Benchmarking"] },
  { id: 11, title: "Risk & Compliance", short: "Protect the business and its stakeholders.", category: "PROTECT", purpose: "Identify and manage business risks while maintaining legal, operational and regulatory compliance.", points: ["Operational Risk", "Financial Risk", "Legal Risk", "Quality Risk", "Safety", "Environmental", "Internal Audit"] },
  { id: 12, title: "Continuous Improvement", short: "Improve systems, quality and efficiency.", category: "IMPROVE", purpose: "Build a culture of continuous improvement through structured methods, innovation and learning.", points: ["Lean", "5S", "Kaizen", "Six Sigma", "DPR", "Innovation", "Lessons Learned", "Standardization"] },
  { id: 13, title: "Customer & Ecosystem", short: "Manage external business relationships.", category: "EXTERNAL", purpose: "Build and manage relationships with customers, partners, suppliers and the wider business ecosystem.", points: ["Customers", "Dealers", "Contractors", "Distributors", "Vendors", "Banks", "Government", "Consultants"] },
  { id: 14, title: "Finance", short: "Plan, manage and control business finances.", category: "MONEY", purpose: "Manage financial planning, cash flow, costs, profitability and investments to support sustainable growth.", points: ["Budget", "Cash Flow", "Working Capital", "Costing", "Profitability", "Pricing", "Investments", "Financial Controls"] },
  { id: 15, title: "Projects & Change", short: "Deliver strategic projects and business change.", category: "CHANGE", purpose: "Plan and deliver strategic initiatives, manage organizational change and ensure adoption of improvements.", points: ["Strategic Projects", "PMO", "Milestones", "Change Management", "Rollouts", "Benefits Tracking", "Communication", "Adoption"] },
];

const makePillar = (item: Omit<BlueprintPillar, "elementStatuses">): BlueprintPillar => ({
  ...item,
  elementStatuses: Object.fromEntries(item.points.map((point) => [point, "pending"])),
});

const initialPillars = rawInitialPillars.map((item) => makePillar(item));

function normalizePillars(value: unknown): BlueprintPillar[] {
  if (!Array.isArray(value)) return initialPillars;
  return value.map((item: any) => {
    const points = Array.isArray(item.points) ? item.points.filter((p: unknown) => typeof p === "string") : [];
    const oldStatuses = item.elementStatuses ?? {};
    const elementStatuses: Record<string, ElementStatus> = {};
    points.forEach((point: string) => {
      const status = oldStatuses[point];
      elementStatuses[point] = status === "completed" || status === "in_progress" ? status : "pending";
    });
    return {
      id: Number(item.id) || Date.now(),
      title: String(item.title ?? ""),
      short: String(item.short ?? ""),
      category: String(item.category ?? ""),
      purpose: String(item.purpose ?? ""),
      points,
      elementStatuses,
    };
  });
}

function loadPillars(): BlueprintPillar[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialPillars;
    return normalizePillars(JSON.parse(saved));
  } catch (error) {
    console.error("Unable to load CRM blueprint:", error);
    return initialPillars;
  }
}

function createEmptyPillar(id: number): BlueprintPillar {
  return { id, title: "", short: "", category: "", purpose: "", points: [], elementStatuses: {} };
}

const statusLabel: Record<ElementStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

export default function CrmBlueprintPage() {
  const [pillars, setPillars] = useState<BlueprintPillar[]>(loadPillars);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<BlueprintPillar | null>(null);
  const [pointsText, setPointsText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pillars));
      setStorageError("");
    } catch (error) {
      console.error("Unable to save CRM blueprint:", error);
      setStorageError("Unable to save changes in this browser.");
    }
  }, [pillars]);

  const filteredPillars = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return pillars;
    return pillars.filter((pillar) =>
      [pillar.title, pillar.short, pillar.category, pillar.purpose, ...pillar.points]
        .join(" ").toLowerCase().includes(term)
    );
  }, [pillars, search]);

  const allElements = pillars.reduce((total, pillar) => total + pillar.points.length, 0);
  const completedCount = pillars.reduce(
    (total, pillar) => total + pillar.points.filter((point) => pillar.elementStatuses[point] === "completed").length, 0
  );
  const inProgressCount = pillars.reduce(
    (total, pillar) => total + pillar.points.filter((point) => pillar.elementStatuses[point] === "in_progress").length, 0
  );
  const pendingCount = allElements - completedCount - inProgressCount;

  const updateElementStatus = (pillarId: number, point: string, status: ElementStatus) => {
    setPillars((current) => current.map((pillar) =>
      pillar.id === pillarId
        ? { ...pillar, elementStatuses: { ...pillar.elementStatuses, [point]: status } }
        : pillar
    ));
  };

  const openCreate = () => {
    const nextId = pillars.length ? Math.max(...pillars.map((p) => p.id)) + 1 : 1;
    const empty = createEmptyPillar(nextId);
    setEditing(empty);
    setPointsText("");
    setIsCreating(true);
  };

  const openEdit = (pillar: BlueprintPillar) => {
    setEditing({ ...pillar, elementStatuses: { ...pillar.elementStatuses } });
    setPointsText(pillar.points.join("\n"));
    setIsCreating(false);
  };

  const closeEditor = () => {
    setEditing(null);
    setPointsText("");
    setIsCreating(false);
  };

  const savePillar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;

    const points = [...new Set(pointsText.split("\n").map((p) => p.trim()).filter(Boolean))];
    const elementStatuses: Record<string, ElementStatus> = {};
    points.forEach((point) => {
      elementStatuses[point] = editing.elementStatuses[point] ?? "pending";
    });

    const updated: BlueprintPillar = {
      ...editing,
      title: editing.title.trim(),
      short: editing.short.trim(),
      category: editing.category.trim().toUpperCase(),
      purpose: editing.purpose.trim(),
      points,
      elementStatuses,
    };

    if (!updated.title || !updated.category || !updated.purpose) return;

    setPillars((current) => isCreating
      ? [...current, updated]
      : current.map((pillar) => pillar.id === updated.id ? updated : pillar)
    );
    closeEditor();
  };

  const deletePillar = (id: number) => {
    if (!window.confirm("Delete this pillar from this browser's saved blueprint?")) return;
    setPillars((current) => current.filter((pillar) => pillar.id !== id));
  };

  const restoreOriginal = () => {
    setPillars(initialPillars);
    setShowResetConfirm(false);
  };

  const editPoints = [...new Set(pointsText.split("\n").map((point) => point.trim()).filter(Boolean))];
  const editTotal = editing ? editPoints.length : 0;
  const editCompleted = editing
    ? editPoints.filter((point) => editing.elementStatuses[point] === "completed").length
    : 0;
  const editInProgress = editing
    ? editPoints.filter((point) => editing.elementStatuses[point] === "in_progress").length
    : 0;
  const editPending = editTotal - editCompleted - editInProgress;
  const editPercent = editTotal ? Math.round((editCompleted / editTotal) * 100) : 0;

  return (
    <div className="crm-blueprint-page">
      <header className="blueprint-header">
        <div>
          {/* <div className="blueprint-eyebrow">ROCKSTAR CRM / BUSINESS FRAMEWORK</div> */}
          <h1>Business Operating Blueprint</h1>
          {/* <p>Manage every business pillar and track each key element independently.</p> */}
        </div>
        <button className="blueprint-add-button" type="button" onClick={openCreate}>＋ Add Pillar</button>
      </header>

      <section className="blueprint-summary">
        <div className="blueprint-summary-item"><span className="summary-icon">◈</span><div><strong>{pillars.length}</strong><span>Total Pillars</span></div></div>
        <div className="blueprint-summary-item"><span className="summary-icon">▤</span><div><strong>{allElements}</strong><span>Key Elements</span></div></div>
        <div className="blueprint-summary-item"><span className="summary-icon">✓</span><div><strong>{completedCount}</strong><span>Completed</span></div></div>
        <div className="blueprint-summary-item"><span className="summary-icon">◷</span><div><strong>{inProgressCount}</strong><span>In Progress</span></div></div>
        <div className="blueprint-summary-item"><span className="summary-icon">○</span><div><strong>{pendingCount}</strong><span>Pending</span></div></div>
      </section>

      <div className="blueprint-toolbar">
        <div className="blueprint-legend">
          <span><i className="legend-dot completed" /> Completed</span>
          <span><i className="legend-dot in_progress" /> In Progress</span>
          <span><i className="legend-dot pending" /> Pending</span>
        </div>
        <div className="blueprint-toolbar-actions">
          <label className="blueprint-search">
            <span>⌕</span>
            <input type="search" placeholder="Search pillars or key elements..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>}
          </label>
          <button type="button" className="blueprint-reset-button" onClick={() => setShowResetConfirm(true)}>Restore Original</button>
        </div>
      </div>

      {storageError && <div className="blueprint-storage-error">{storageError}</div>}

      <section className="blueprint-flow-section">
        <div className="blueprint-section-heading">
          <div><h2>Business Framework</h2><p>Click a status dot to cycle Pending → In Progress → Completed.</p></div>
          <span>{filteredPillars.length} Pillars</span>
        </div>

        {filteredPillars.length === 0 ? (
          <div className="blueprint-empty"><h3>No pillars found</h3><p>Try another search keyword.</p></div>
        ) : (
          <div className="blueprint-pillar-grid">
            {filteredPillars.map((pillar) => {
              return (
                <article className="blueprint-pillar-card" key={pillar.id}>
                  <div className="pillar-card-top">
                    <span className="pillar-number">{String(pillars.findIndex((p) => p.id === pillar.id) + 1).padStart(2, "0")}</span>
                    <div className="pillar-card-heading">
                      <span className="pillar-card-title">{pillar.title}</span>
                      <span className="pillar-card-category">{pillar.category}</span>
                    </div>
                    <div className="pillar-card-actions">
                      <button type="button" onClick={() => openEdit(pillar)} aria-label={`Edit ${pillar.title}`} title="Edit pillar">✎</button>
                      <button type="button" onClick={() => deletePillar(pillar.id)} aria-label={`Delete ${pillar.title}`} title="Delete pillar">×</button>
                    </div>
                  </div>
                  {/* <div className="pillar-elements-heading"><span>KEY ELEMENTS</span></div> */}
                  <div className="pillar-key-elements">
                    {pillar.points.map((point, pointIndex) => {
                      const status = pillar.elementStatuses[point] ?? "pending";
                      const nextStatus: ElementStatus = status === "pending" ? "in_progress" : status === "in_progress" ? "completed" : "pending";
                      return (
                        <div className={`pillar-element-row status-${status}`} key={`${pillar.id}-${pointIndex}`}>
                          <span className="element-number">{String(pointIndex + 1).padStart(2, "0")}</span>
                          <span className="element-name">{point}</span>
                          <button
                            type="button"
                            className={`element-status-dot status-${status}`}
                            aria-label={`${pillar.title}: ${point} is ${statusLabel[status]}. Click to change to ${statusLabel[nextStatus]}`}
                            title={`${statusLabel[status]} · Click to change`}
                            onClick={() => updateElementStatus(pillar.id, point, nextStatus)}
                          />
                        </div>
                      );
                    })}
                    {pillar.points.length === 0 && <p className="no-elements">No key elements added.</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editing && (
        <div className="blueprint-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeEditor(); }}>
          <section className="blueprint-editor-modal" role="dialog" aria-modal="true" aria-labelledby="blueprint-editor-title">
            <div className="blueprint-modal-header">
              <div><span className="blueprint-eyebrow">BUSINESS OPERATING FRAMEWORK</span><h2 id="blueprint-editor-title">{isCreating ? "Add New Pillar" : "Edit Pillar"}</h2></div>
              <button type="button" className="blueprint-close-button" onClick={closeEditor} aria-label="Close">×</button>
            </div>
            {!isCreating && (
              <div className="blueprint-editor-status-summary">
                <div className="blueprint-editor-status-heading">
                  <strong>{editCompleted}/{editTotal} Completed</strong>
                  <strong>{editPercent}%</strong>
                </div>
                <div className="blueprint-editor-progress-track">
                  <span style={{ width: `${editPercent}%` }} />
                </div>
                <div className="blueprint-editor-status-counts">
                  <span className="mini-completed">{editCompleted} Done</span>
                  <span className="mini-progress">{editInProgress} Active</span>
                  <span className="mini-pending">{editPending} Pending</span>
                </div>
              </div>
            )}
            <form className="blueprint-edit-form" onSubmit={savePillar}>
              <label>Pillar Name *<input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Enter pillar name" /></label>
              <label>Category / Code *<input required value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="e.g. WHY" /></label>
              <label>Pillar Short Description<input value={editing.short} onChange={(e) => setEditing({ ...editing, short: e.target.value })} placeholder="Short description" /></label>
              <label>Purpose *<textarea required rows={3} value={editing.purpose} onChange={(e) => setEditing({ ...editing, purpose: e.target.value })} placeholder="Describe the purpose of this pillar" /></label>
              <label>Key Elements <span className="blueprint-field-hint">Enter one element per line. Existing statuses are retained when the element name stays the same.</span><textarea rows={10} value={pointsText} onChange={(e) => setPointsText(e.target.value)} placeholder={"Vision\nMission\nCore Values"} /></label>
              <div className="blueprint-form-actions">
                <button type="button" className="blueprint-secondary-button" onClick={closeEditor}>Cancel</button>
                <button type="submit" className="blueprint-primary-button">{isCreating ? "Add Pillar" : "Save Changes"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showResetConfirm && (
        <div className="blueprint-modal-backdrop">
          <section className="blueprint-confirm-modal" role="alertdialog" aria-modal="true">
            <h3>Restore Original Blueprint?</h3>
            <p>This replaces all saved pillars and status updates in this browser with the original 15-pillar framework.</p>
            <div className="blueprint-form-actions">
              <button type="button" className="blueprint-secondary-button" onClick={() => setShowResetConfirm(false)}>Cancel</button>
              <button type="button" className="blueprint-primary-button" onClick={restoreOriginal}>Restore Original</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
