
import { useEffect, useMemo, useState, type FormEvent } from "react";
import "./crm-blueprint.css";

type BlueprintPillar = {
  id: number;
  title: string;
  short: string;
  category: string;
  purpose: string;
  points: string[];
};

type ViewMode = "flow" | "index";

const STORAGE_KEY = "rockstar_crm_blueprint_v3";

const initialPillars: BlueprintPillar[] = [
  {
    id: 1,
    title: "Strategy",
    short: "Define the direction and purpose of the business.",
    category: "WHY",
    purpose:
      "Define why the business exists, where it wants to go and how it will achieve its long-term vision.",
    points: [
      "Vision",
      "Mission",
      "Core Values",
      "Objectives",
      "Strategic Priorities",
      "Business Operating Model Canvas – 15 Building Blocks",
      "Competitive Advantage",
      "Business Goals",
      "Annual Operating Plan",
    ],
  },
  {
    id: 2,
    title: "Governance",
    short: "Establish authority, policies and control.",
    category: "CONTROL",
    purpose:
      "Establish the policies, responsibilities, authority and controls that guide how the business is managed.",
    points: [
      "Policies",
      "SOP Approval",
      "Authority Matrix",
      "Delegation of Authority",
      "Risk Management",
      "Compliance",
      "Audit",
      "Escalation Matrix",
    ],
  },
  {
    id: 3,
    title: "Business Architecture",
    short: "Define what the business does and delivers.",
    category: "WHAT",
    purpose:
      "Describe the business model, value streams, capabilities and processes that create value for customers.",
    points: [
      "Business Model",
      "Value Streams",
      "Products",
      "Services",
      "Customers",
      "Functions",
      "Processes",
      "Capabilities",
    ],
  },
  {
    id: 4,
    title: "Organization",
    short: "Define the structure and responsibilities.",
    category: "WHO",
    purpose:
      "Design the organization structure and clarify departments, teams, roles and accountability.",
    points: [
      "Organization Structure",
      "Departments",
      "Teams",
      "Roles",
      "Job Descriptions",
      "RACI",
      "Span of Control",
    ],
  },
  {
    id: 5,
    title: "People",
    short: "Build and develop the workforce.",
    category: "WORKFORCE",
    purpose:
      "Attract, develop, engage and retain the people required to achieve business objectives.",
    points: [
      "Hiring",
      "Training",
      "Skills",
      "Competency Matrix",
      "Performance",
      "Rewards",
      "Career Path",
      "Culture",
    ],
  },
  {
    id: 6,
    title: "Processes",
    short: "Define how work gets done.",
    category: "HOW",
    purpose:
      "Create consistent and measurable ways of working through documented processes and controls.",
    points: [
      "Process Maps",
      "SOPs",
      "Work Instructions",
      "Checklists",
      "Process Owners",
      "KPIs",
      "Inputs",
      "Outputs",
      "Controls",
    ],
  },
  {
    id: 7,
    title: "Resources",
    short: "Manage the resources used by the business.",
    category: "WHAT WE USE",
    purpose:
      "Identify, allocate and manage the resources needed for effective business operations.",
    points: [
      "People",
      "Materials",
      "Machines",
      "Money",
      "Methods",
      "Information",
      "Facilities",
      "Suppliers",
    ],
  },
  {
    id: 8,
    title: "Technology",
    short: "Enable the business through digital systems.",
    category: "AUTOMATION",
    purpose:
      "Use technology, digital systems and automation to improve business efficiency and decision-making.",
    points: [
      "ERP",
      "CRM",
      "HRMS",
      "WMS",
      "BI",
      "AI",
      "Workflow Automation",
      "Digital Forms",
      "Analytics",
    ],
  },
  {
    id: 9,
    title: "Data & Information",
    short: "Turn business data into intelligence.",
    category: "INTELLIGENCE",
    purpose:
      "Manage reliable business information and convert data into useful insights for decisions.",
    points: [
      "Master Data",
      "Transaction Data",
      "Reports",
      "Dashboards",
      "Document Management",
      "Data Quality",
    ],
  },
  {
    id: 10,
    title: "Performance Management",
    short: "Measure results and business performance.",
    category: "MEASURE",
    purpose:
      "Track business performance against objectives, targets and measurable outcomes.",
    points: [
      "OKR",
      "Targets",
      "Balanced Scorecard",
      "Dashboards",
      "Reviews",
      "Benchmarking",
    ],
  },
  {
    id: 11,
    title: "Risk & Compliance",
    short: "Protect the business and its stakeholders.",
    category: "PROTECT",
    purpose:
      "Identify and manage business risks while maintaining legal, operational and regulatory compliance.",
    points: [
      "Operational Risk",
      "Financial Risk",
      "Legal Risk",
      "Quality Risk",
      "Safety",
      "Environmental",
      "Internal Audit",
    ],
  },
  {
    id: 12,
    title: "Continuous Improvement",
    short: "Improve systems, quality and efficiency.",
    category: "IMPROVE",
    purpose:
      "Build a culture of continuous improvement through structured methods, innovation and learning.",
    points: [
      "Lean",
      "5S",
      "Kaizen",
      "Six Sigma",
      "DPR",
      "Innovation",
      "Lessons Learned",
      "Standardization",
    ],
  },
  {
    id: 13,
    title: "Customer & Ecosystem",
    short: "Manage external business relationships.",
    category: "EXTERNAL",
    purpose:
      "Build and manage relationships with customers, partners, suppliers and the wider business ecosystem.",
    points: [
      "Customers",
      "Dealers",
      "Contractors",
      "Distributors",
      "Vendors",
      "Banks",
      "Government",
      "Consultants",
    ],
  },
  {
    id: 14,
    title: "Finance",
    short: "Plan, manage and control business finances.",
    category: "MONEY",
    purpose:
      "Manage financial planning, cash flow, costs, profitability and investments to support sustainable growth.",
    points: [
      "Budget",
      "Cash Flow",
      "Working Capital",
      "Costing",
      "Profitability",
      "Pricing",
      "Investments",
      "Financial Controls",
    ],
  },
  {
    id: 15,
    title: "Projects & Change",
    short: "Deliver strategic projects and business change.",
    category: "CHANGE",
    purpose:
      "Plan and deliver strategic initiatives, manage organizational change and ensure adoption of improvements.",
    points: [
      "Strategic Projects",
      "PMO",
      "Milestones",
      "Change Management",
      "Rollouts",
      "Benefits Tracking",
      "Communication",
      "Adoption",
    ],
  },
];

function loadPillars(): BlueprintPillar[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return initialPillars;
    }

    const parsed: unknown = JSON.parse(saved);

    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item) =>
          typeof item.id === "number" &&
          typeof item.title === "string" &&
          typeof item.short === "string" &&
          typeof item.category === "string" &&
          typeof item.purpose === "string" &&
          Array.isArray(item.points) &&
          item.points.every((point: unknown) => typeof point === "string")
      )
    ) {
      return parsed as BlueprintPillar[];
    }
  } catch (error) {
    console.error("Unable to load CRM blueprint:", error);
  }

  return initialPillars;
}

function createEmptyPillar(id: number): BlueprintPillar {
  return {
    id,
    title: "",
    short: "",
    category: "",
    purpose: "",
    points: [],
  };
}

export default function CrmBlueprintPage() {
  const [pillars, setPillars] = useState<BlueprintPillar[]>(loadPillars);
  const [activeView, setActiveView] = useState<ViewMode>("flow");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [draft, setDraft] = useState<BlueprintPillar | null>(null);
  const [pointsText, setPointsText] = useState("");
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

    return pillars.filter((pillar) => {
      const searchable = [
        pillar.title,
        pillar.short,
        pillar.category,
        pillar.purpose,
        ...pillar.points,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [pillars, search]);

  const selectedPillar = pillars.find(
    (pillar) => pillar.id === selectedId
  );

  const selectedIndex = pillars.findIndex(
    (pillar) => pillar.id === selectedId
  );

  const openPillar = (id: number) => {
    setSelectedId(id);
    setIsEditing(false);
    setIsCreating(false);
    setShowDeleteConfirm(false);
    setDraft(null);
  };

  const closeModal = () => {
    setSelectedId(null);
    setIsEditing(false);
    setIsCreating(false);
    setShowDeleteConfirm(false);
    setDraft(null);
  };

  const openCreate = () => {
    const nextId =
      pillars.length > 0
        ? Math.max(...pillars.map((pillar) => pillar.id)) + 1
        : 1;

    setSelectedId(null);
    setDraft(createEmptyPillar(nextId));
    setPointsText("");
    setIsCreating(true);
    setIsEditing(true);
  };

  const openEdit = () => {
    if (!selectedPillar) return;

    setDraft({ ...selectedPillar });
    setPointsText(selectedPillar.points.join("\n"));
    setIsEditing(true);
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setDraft(null);
    setPointsText("");
    setIsEditing(false);

    if (isCreating) {
      setIsCreating(false);
    }
  };

  const savePillar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft) return;

    const cleanedPoints = pointsText
      .split("\n")
      .map((point) => point.trim())
      .filter(Boolean);

    const updatedPillar: BlueprintPillar = {
      ...draft,
      title: draft.title.trim(),
      short: draft.short.trim(),
      category: draft.category.trim().toUpperCase(),
      purpose: draft.purpose.trim(),
      points: cleanedPoints,
    };

    if (
      !updatedPillar.title ||
      !updatedPillar.category ||
      !updatedPillar.purpose
    ) {
      return;
    }

    if (isCreating) {
      setPillars((current) => [...current, updatedPillar]);
      setSelectedId(updatedPillar.id);
    } else {
      setPillars((current) =>
        current.map((pillar) =>
          pillar.id === updatedPillar.id ? updatedPillar : pillar
        )
      );
    }

    setDraft(null);
    setPointsText("");
    setIsEditing(false);
    setIsCreating(false);
  };

  const deletePillar = () => {
    if (!selectedPillar) return;

    const remaining = pillars.filter(
      (pillar) => pillar.id !== selectedPillar.id
    );

    setPillars(remaining);
    setSelectedId(null);
    setShowDeleteConfirm(false);
    setIsEditing(false);
    setDraft(null);
  };

  const resetPillars = () => {
    setPillars(initialPillars);
    setSelectedId(null);
    setShowResetConfirm(false);
    setIsEditing(false);
    setDraft(null);
  };

  const goToPillar = (direction: -1 | 1) => {
    if (selectedIndex < 0 || pillars.length === 0) return;

    const nextIndex =
      (selectedIndex + direction + pillars.length) % pillars.length;

    openPillar(pillars[nextIndex].id);
  };

  const updateDraft = (
    field: keyof BlueprintPillar,
    value: string
  ) => {
    setDraft((current) =>
      current ? { ...current, [field]: value } : current
    );
  };

  return (
    <div className="crm-blueprint-page">
      <div className="blueprint-header">
        <div>
          <div className="blueprint-eyebrow">
            ROCKSTAR CRM / BUSINESS FRAMEWORK
          </div>
          <h1>Business Operating Blueprint</h1>
          <p>
            A structured framework to design, manage and grow your business.
          </p>
        </div>

        <button
          type="button"
          className="blueprint-add-button"
          onClick={openCreate}
        >
          <span>＋</span> Add Pillar
        </button>
      </div>

      <div className="blueprint-summary">
        <div className="blueprint-summary-item">
          <span className="summary-icon">◈</span>
          <div>
            <strong>{pillars.length}</strong>
            <span>Total Pillars</span>
          </div>
        </div>

        <div className="blueprint-summary-item">
          <span className="summary-icon">▤</span>
          <div>
            <strong>
              {pillars.reduce(
                (total, pillar) => total + pillar.points.length,
                0
              )}
            </strong>
            <span>Key Elements</span>
          </div>
        </div>

        <div className="blueprint-summary-item">
          <span className="summary-icon">⌕</span>
          <div>
            <strong>2</strong>
            <span>Viewing Modes</span>
          </div>
        </div>
      </div>

      <div className="blueprint-toolbar">
        <div className="blueprint-tabs">
          <button
            type="button"
            className={activeView === "flow" ? "active" : ""}
            onClick={() => setActiveView("flow")}
          >
            <span>▦</span> Data Flow
          </button>

          <button
            type="button"
            className={activeView === "index" ? "active" : ""}
            onClick={() => setActiveView("index")}
          >
            <span>☷</span> Index View
          </button>
        </div>

        <div className="blueprint-toolbar-actions">
          <label className="blueprint-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search pillars or elements..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </label>

          <button
            type="button"
            className="blueprint-reset-button"
            onClick={() => setShowResetConfirm(true)}
          >
            Restore Original
          </button>
        </div>
      </div>

      {storageError && (
        <div className="blueprint-storage-error">{storageError}</div>
      )}

      {activeView === "flow" ? (
        <section className="blueprint-flow-section">
          <div className="blueprint-section-heading">
            <div>
              <h2>Business Framework</h2>
              <p>Select any pillar to explore its components.</p>
            </div>
            <span>{filteredPillars.length} pillars</span>
          </div>

          {filteredPillars.length === 0 ? (
            <div className="blueprint-empty">
              <span>⌕</span>
              <h3>No pillars found</h3>
              <p>Try searching with another keyword.</p>
            </div>
          ) : (
            <div className="blueprint-pillar-grid">
              {filteredPillars.map((pillar, index) => (
                <button
                  type="button"
                  className="blueprint-pillar-card"
                  key={pillar.id}
                  onClick={() => openPillar(pillar.id)}
                >
                  <div className="pillar-card-top">
                    <span className="pillar-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="pillar-arrow">↗</span>
                  </div>

                  <span className="pillar-category">
                    {pillar.category}
                  </span>

                  <h3>{pillar.title}</h3>
                  <p>{pillar.short}</p>

                  <div className="pillar-card-footer">
                    <span>{pillar.points.length} Key Elements</span>
                    <span className="pillar-open-label">Explore →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="blueprint-index-section">
          <div className="blueprint-section-heading">
            <div>
              <h2>Pillar Index</h2>
              <p>Browse all pillars and their key element counts.</p>
            </div>
            <span>{filteredPillars.length} results</span>
          </div>

          {filteredPillars.length === 0 ? (
            <div className="blueprint-empty">
              <span>⌕</span>
              <h3>No pillars found</h3>
              <p>Try searching with another keyword.</p>
            </div>
          ) : (
            <div className="blueprint-index-list">
              {filteredPillars.map((pillar, index) => (
                <button
                  type="button"
                  className="blueprint-index-row"
                  key={pillar.id}
                  onClick={() => openPillar(pillar.id)}
                >
                  <span className="index-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="index-main">
                    <strong>{pillar.title}</strong>
                    <span>{pillar.short}</span>
                  </div>

                  <span className="index-category">
                    {pillar.category}
                  </span>

                  <span className="index-count">
                    {pillar.points.length} Elements
                  </span>

                  <span className="index-arrow">→</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* PILLAR DETAILS POPUP */}
      {selectedPillar && !isCreating && (
        <div
          className="blueprint-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="blueprint-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pillar-modal-title"
          >
            <div className="blueprint-modal-header">
              <div className="blueprint-modal-heading">
                <span className="blueprint-modal-eyebrow">
                  PILLAR {String(selectedIndex + 1).padStart(2, "0")} /{" "}
                  {selectedPillar.category}
                </span>
                <span className="blueprint-modal-caption">
                  BUSINESS OPERATING FRAMEWORK
                </span>
              </div>

              <div className="blueprint-modal-header-actions">
                {!isEditing && (
                  <button
                    type="button"
                    className="blueprint-edit-button"
                    onClick={openEdit}
                  >
                    <span>✎</span> Edit
                  </button>
                )}

                <button
                  type="button"
                  className="blueprint-close-button"
                  aria-label="Close"
                  onClick={closeModal}
                >
                  ×
                </button>
              </div>
            </div>

            {isEditing && draft ? (
              <form
                className="blueprint-edit-form"
                onSubmit={savePillar}
              >
                <div className="blueprint-form-title">
                  <h2>{isCreating ? "Add New Pillar" : "Edit Pillar"}</h2>
                  <p>Update the pillar details and its key elements.</p>
                </div>

                <label>
                  Pillar Name *
                  <input
                    required
                    value={draft.title}
                    onChange={(event) =>
                      updateDraft("title", event.target.value)
                    }
                    placeholder="Enter pillar name"
                  />
                </label>

                <div className="blueprint-form-two-columns">
                  <label>
                    Category / Purpose Code *
                    <input
                      required
                      value={draft.category}
                      onChange={(event) =>
                        updateDraft("category", event.target.value)
                      }
                      placeholder="e.g. WHY"
                    />
                  </label>

                  <label>
                    Short Description
                    <input
                      value={draft.short}
                      onChange={(event) =>
                        updateDraft("short", event.target.value)
                      }
                      placeholder="Short description"
                    />
                  </label>
                </div>

                <label>
                  Purpose *
                  <textarea
                    required
                    rows={3}
                    value={draft.purpose}
                    onChange={(event) =>
                      updateDraft("purpose", event.target.value)
                    }
                    placeholder="Describe the purpose of this pillar"
                  />
                </label>

                <label>
                  Key Elements
                  <span className="blueprint-field-hint">
                    Enter one element per line.
                  </span>
                  <textarea
                    rows={9}
                    value={pointsText}
                    onChange={(event) => setPointsText(event.target.value)}
                    placeholder={"Vision\nMission\nCore Values"}
                  />
                </label>

                <div className="blueprint-form-actions">
                  <button
                    type="button"
                    className="blueprint-secondary-button"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="blueprint-primary-button"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="blueprint-detail-intro">
                  <h2 id="pillar-modal-title">{selectedPillar.title}</h2>
                  <p>{selectedPillar.purpose}</p>
                </div>

                <div className="blueprint-detail-content">
                  <div className="blueprint-elements-heading">
                    <div>
                      <span className="blueprint-content-eyebrow">
                        PILLAR COMPONENTS
                      </span>
                      <h3>Key Elements</h3>
                    </div>

                    <span className="blueprint-element-count">
                      {selectedPillar.points.length} Elements
                    </span>
                  </div>

                  {selectedPillar.points.length > 0 ? (
                    <div className="blueprint-element-list">
                      {selectedPillar.points.map((point, index) => (
                        <div className="blueprint-element-row" key={`${selectedPillar.id}-${index}`}>
                          <span className="element-number">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <strong>{point}</strong>
                          <span className="element-arrow">→</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="blueprint-no-elements">
                      No key elements have been added yet.
                    </div>
                  )}
                </div>

                <div className="blueprint-modal-navigation">
                  <button
                    type="button"
                    className="blueprint-nav-button"
                    onClick={() => goToPillar(-1)}
                    disabled={pillars.length < 2}
                  >
                    <span>←</span>
                    <span>Previous Pillar</span>
                  </button>

                  <span className="blueprint-nav-position">
                    {selectedIndex + 1} / {pillars.length}
                  </span>

                  <button
                    type="button"
                    className="blueprint-nav-button next"
                    onClick={() => goToPillar(1)}
                    disabled={pillars.length < 2}
                  >
                    <span>Next Pillar</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="blueprint-delete-area">
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      className="blueprint-delete-button"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete this pillar
                    </button>
                  ) : (
                    <div className="blueprint-delete-confirm">
                      <div>
                        <strong>Delete this pillar?</strong>
                        <span>
                          This will permanently remove this pillar from this
                          browser's saved blueprint.
                        </span>
                      </div>
                      <div className="blueprint-delete-confirm-actions">
                        <button
                          type="button"
                          className="blueprint-secondary-button"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="blueprint-confirm-delete-button"
                          onClick={deletePillar}
                        >
                          Yes, Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* CREATE PILLAR POPUP */}
      {isCreating && draft && (
        <div
          className="blueprint-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cancelEdit();
          }}
        >
          <section
            className="blueprint-detail-modal blueprint-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-pillar-title"
          >
            <div className="blueprint-modal-header">
              <div className="blueprint-modal-heading">
                <span className="blueprint-modal-eyebrow">
                  BUSINESS OPERATING FRAMEWORK
                </span>
              </div>
              <button
                type="button"
                className="blueprint-close-button"
                aria-label="Close"
                onClick={cancelEdit}
              >
                ×
              </button>
            </div>

            <form className="blueprint-edit-form" onSubmit={savePillar}>
              <div className="blueprint-form-title">
                <h2 id="create-pillar-title">Add New Pillar</h2>
                <p>Create a new pillar and define its key elements.</p>
              </div>

              <label>
                Pillar Name *
                <input
                  required
                  value={draft.title}
                  onChange={(event) =>
                    updateDraft("title", event.target.value)
                  }
                  placeholder="Enter pillar name"
                />
              </label>

              <div className="blueprint-form-two-columns">
                <label>
                  Category / Purpose Code *
                  <input
                    required
                    value={draft.category}
                    onChange={(event) =>
                      updateDraft("category", event.target.value)
                    }
                    placeholder="e.g. WHY"
                  />
                </label>

                <label>
                  Short Description
                  <input
                    value={draft.short}
                    onChange={(event) =>
                      updateDraft("short", event.target.value)
                    }
                    placeholder="Short description"
                  />
                </label>
              </div>

              <label>
                Purpose *
                <textarea
                  required
                  rows={3}
                  value={draft.purpose}
                  onChange={(event) =>
                    updateDraft("purpose", event.target.value)
                  }
                  placeholder="Describe the purpose"
                />
              </label>

              <label>
                Key Elements
                <span className="blueprint-field-hint">
                  Enter one element per line.
                </span>
                <textarea
                  rows={8}
                  value={pointsText}
                  onChange={(event) => setPointsText(event.target.value)}
                  placeholder={"First element\nSecond element"}
                />
              </label>

              <div className="blueprint-form-actions">
                <button
                  type="button"
                  className="blueprint-secondary-button"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="blueprint-primary-button"
                >
                  Add Pillar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* RESTORE CONFIRMATION */}
      {showResetConfirm && (
        <div className="blueprint-modal-backdrop blueprint-confirm-backdrop">
          <section
            className="blueprint-confirm-modal"
            role="alertdialog"
            aria-modal="true"
          >
            <div className="blueprint-confirm-icon">↺</div>
            <h3>Restore Original Blueprint?</h3>
            <p>
              This will replace your current saved pillars with the original
              15-pillar framework. Your custom changes will be lost.
            </p>
            <div className="blueprint-form-actions">
              <button
                type="button"
                className="blueprint-secondary-button"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="blueprint-primary-button"
                onClick={resetPillars}
              >
                Restore Original
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
