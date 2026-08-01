import React, { useState, useEffect } from 'react';

/**
 * InteractiveTutorial Component
 * Targeted spotlight overlay with directional arrows pointing directly to UI elements.
 */
export default function InteractiveTutorial({
  isOpen,
  onClose,
  setActivePage,
  setHistoryFilter,
  setSelectedIncident,
  setSettingsTab, // 👈 Added prop to switch sub-tabs during tutorial
  reports = []
}) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, arrowPosition: 'top' });

  // Guided tour sequence: Original 9 steps + 4 appended steps (10 to 13)
  const steps = [
    {
      target: '[data-tour="user-manual-btn"]',
      title: "📖 User Manual Quick Access",
      badge: "Header Navigation",
      description: "Clicking this opens the full text documentation manual for reference anytime.",
      placement: "bottom",
      action: () => setActivePage('dashboard')
    },
    {
      target: '[data-tour="fire-card-btn"]',
      title: "🔥 Audit Fire Incident Alerts",
      badge: "Emergency Audits",
      description: "Clicking this card immediately takes you to the ledger filtered specifically for Fire Department incidents.",
      placement: "bottom",
      action: () => setActivePage('dashboard')
    },
    {
      target: '[data-tour="police-card-btn"]',
      title: "🛡️ Audit Police Security Reports",
      badge: "Emergency Audits",
      description: "Direct access button for auditing PNP Law Enforcement alerts and emergency logs.",
      placement: "bottom",
      action: () => setActivePage('dashboard')
    },
    {
      target: '[data-tour="health-card-btn"]',
      title: "➕ Audit Health & Medical Cases",
      badge: "Emergency Audits",
      description: "Filters all incoming emergency cases down to RHU Medical Response dispatches.",
      placement: "bottom",
      action: () => setActivePage('dashboard')
    },
    {
      target: '[data-tour="incident-data-nav"]',
      title: "🗂️ Centralized Incident Ledger",
      badge: "Command Portal",
      description: "Opens the full historical database of all emergency calls across all departments.",
      placement: "top",
      action: () => setActivePage('dashboard')
    },
    {
      target: '[data-tour="id-verification-nav"]',
      title: "🆔 Responder ID Vetting Portal",
      badge: "Command Portal",
      description: "Opens the personnel registration queue to approve or reject new responder signups.",
      placement: "top",
      action: () => setActivePage('dashboard')
    },
    {
      target: '[data-tour="metrics-nav"]',
      title: "📈 Operations Metrics",
      badge: "Command Portal",
      description: "Generates real-time quantitative analytical reports and printable municipal summaries.",
      placement: "top",
      action: () => setActivePage('dashboard')
    },
    {
      target: '[data-tour="access-controls-nav"]',
      title: "⚙️ Access Controls & Spatial Heatmap",
      badge: "Command Portal",
      description: "Opens geospatial heatmap layers and responder account administration tools.",
      placement: "top",
      action: () => setActivePage('dashboard')
    },
    {
      target: '[data-tour="ledger-dossier-panel"]',
      title: "🔎 Incident Dossier & Evidence Log",
      badge: "Audit Inspection",
      description: "Inside the ledger, this panel shows full details: status, map location, citizen ID, real-time AI image checks, and closure remarks.",
      placement: "left",
      action: () => {
        setActivePage('history');
        setHistoryFilter('ALL');
        if (reports.length > 0) setSelectedIncident(reports[0]);
      }
    },
    // ➕ NEW STEP 10: ID Verification Page
    {
      target: '[data-tour="id-vetting-panel"]',
      title: "🆔 Responder Credentials Vetting",
      badge: "Personnel Enrolment",
      description: "Audit submitted ID credentials, assign official responder department roles, and send automated approval emails.",
      placement: "left",
      action: () => setActivePage('email')
    },
    // ➕ NEW STEP 11: Analytics & Reports Page
    {
      target: '[data-tour="stats-kpi-panel"]',
      title: "📊 Operational KPI Metrics",
      badge: "Command Analytics",
      description: "Analyze response resolution performance, breakdown workloads across departments, and print municipal reports.",
      placement: "top",
      action: () => setActivePage('stats')
    },
    // ➕ NEW STEP 12: Heatmap View Tab
    {
      target: '[data-tour="heatmap-view-panel"]',
      title: "🗺️ Spatial Emergency Heatmap",
      badge: "Geospatial Intelligence",
      description: "Visualize geographical high-density emergency clusters and track incident concentrations across the municipality.",
      placement: "top",
      action: () => {
        setActivePage('settings');
        if (setSettingsTab) setSettingsTab('heatmap');
      }
    },
    // ➕ NEW STEP 13: Responder & Citizen Account Controls
    {
      target: '[data-tour="responder-management-panel"]',
      title: "👥 Account Controls & Personnel Registry",
      badge: "Account Administration",
      description: "Manage responder and citizen accounts, inspect uploaded IDs, and handle deactivations or reactivations.",
      placement: "top",
      action: () => {
        setActivePage('settings');
        if (setSettingsTab) setSettingsTab('responders');
      }
    }
  ];

  // Recalculate target element position and popover coordinates
  const updateTargetPosition = () => {
    if (!isOpen) return;

    const currentStep = steps[step];
    if (!currentStep) return;

    // Retry loop to ensure target element is rendered after page state transitions
    let attempts = 0;
    const findElement = () => {
      const el = document.querySelector(currentStep.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });

        calculatePopoverCoords(rect, currentStep.placement);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(findElement, 100);
      } else {
        setTargetRect(null);
      }
    };

    findElement();
  };

  const calculatePopoverCoords = (rect, preferredPlacement) => {
    const margin = 16;
    let top = 0;
    let left = 0;
    let arrowPos = 'top';

    const popoverWidth = 340;
    const popoverHeight = 220;

    if (preferredPlacement === 'bottom') {
      top = rect.bottom + margin;
      left = rect.left + rect.width / 2 - popoverWidth / 2;
      arrowPos = 'top';
    } else if (preferredPlacement === 'top') {
      top = rect.top - popoverHeight - margin;
      left = rect.left + rect.width / 2 - popoverWidth / 2;
      arrowPos = 'bottom';
    } else if (preferredPlacement === 'left') {
      top = rect.top + rect.height / 2 - popoverHeight / 2;
      left = Math.max(20, rect.left - popoverWidth - margin);
      arrowPos = 'right';
    } else {
      top = rect.top + rect.height / 2 - popoverHeight / 2;
      left = rect.right + margin;
      arrowPos = 'left';
    }

    // Keep popover inside viewport bounds
    left = Math.max(16, Math.min(left, window.innerWidth - popoverWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - popoverHeight - 16));

    setPopoverPosition({ top, left, arrowPosition: arrowPos });
  };

  useEffect(() => {
    if (isOpen) {
      if (steps[step]?.action) {
        steps[step].action();
      }
      setTimeout(updateTargetPosition, 200);
    }
  }, [step, isOpen]);

  useEffect(() => {
    window.addEventListener('resize', updateTargetPosition);
    return () => window.removeEventListener('resize', updateTargetPosition);
  }, [step, isOpen]);

  if (!isOpen) return null;

  const current = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleClose = () => {
    setStep(0);
    setActivePage('dashboard');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* Dark Overlay Background */}
      <div className="absolute inset-0 bg-slate-900/60 transition-opacity duration-300" onClick={handleClose} />

      {/* Target Element Spotlight Highlight Box */}
      {targetRect && (
        <div
          className="absolute border-2 border-indigo-400 rounded-xl shadow-[0_0_25px_rgba(99,102,241,0.8)] transition-all duration-300 pointer-events-none bg-indigo-500/10"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12
          }}
        />
      )}

      {/* Popover Card with Pointer Arrow */}
      <div
        className="fixed z-[101] bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 max-w-[340px] w-full transition-all duration-300"
        style={{ top: popoverPosition.top, left: popoverPosition.left }}
      >
        {/* CSS Directional Arrow */}
        <div
          className={`absolute w-4 h-4 bg-white rotate-45 border-slate-200 ${
            popoverPosition.arrowPosition === 'top'
              ? '-top-2 left-1/2 -translate-x-1/2 border-t border-l'
              : popoverPosition.arrowPosition === 'bottom'
              ? '-bottom-2 left-1/2 -translate-x-1/2 border-b border-r'
              : popoverPosition.arrowPosition === 'right'
              ? '-right-2 top-1/2 -translate-x-1/2 border-t border-r'
              : '-left-2 top-1/2 -translate-x-1/2 border-b border-l'
          }`}
        />

        {/* Card Header & Counter */}
        <div className="flex items-center justify-between border-b pb-2">
          <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {current.badge}
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            {step + 1} / {steps.length}
          </span>
        </div>

        {/* Card Title & Content */}
        <div className="space-y-1.5">
          <h4 className="text-base font-extrabold text-slate-900 leading-tight">
            {current.title}
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-2 border-t">
          <button
            onClick={handlePrev}
            disabled={step === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              step === 0
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            ◀ Back
          </button>

          <button
            onClick={handleNext}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1"
          >
            {step === steps.length - 1 ? 'Finish Tour 🎉' : 'Next ➔'}
          </button>
        </div>
      </div>
    </div>
  );
}