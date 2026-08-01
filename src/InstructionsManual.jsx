import React from 'react';

function InstructionsManual({ isOpen, onClose }) {
  // If the modal isn't active, render nothing
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 print:hidden animate-fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <div>
              <h3 className="font-extrabold text-base tracking-wider uppercase">LGU Dashboard Instructions Manual</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Button Usage & Operational Workflow Guide</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-black bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body / Feature Manual */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Section 1 */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 text-sm border-b pb-1 flex items-center gap-2">
              🏛️ 1. Control Center Navigation & Command Actions
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>🔥 Audit Fire Alerts:</strong> Navigates to the Incident Ledger filtered specifically for Fire Department reports.</li>
              <li><strong>🛡️ Audit Police Reports:</strong> Navigates to the Incident Ledger filtered specifically for Police Department records.</li>
              <li><strong>➕ Audit Medical Cases:</strong> Navigates to the Incident Ledger filtered specifically for RHU Health & Medical cases.</li>
              <li><strong>🗂️ INCIDENT DATA:</strong> Opens the central Incident Ledger displaying all live, active, and solved citizen emergency reports.</li>
              <li><strong>🆔 ID VERIFICATION:</strong> Opens the candidate responder vetting interface to inspect government ID photos and assign app login access.</li>
              <li><strong>📈 OPERATIONS METRICS:</strong> Displays overall emergency KPI analytics, resolution completion percentages, and printable municipal summary reports.</li>
              <li><strong>⚙️ ACCESS CONTROLS:</strong> Opens the geospatial Leaflet heatmap and personnel account management hub.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 text-sm border-b pb-1 flex items-center gap-2">
              🗂️ 2. Incident Ledger Controls & Filters
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>📂 Show All Alerts / ✅ Audited Cases Only:</strong> Toggles between displaying every report versus only closed/resolved incidents.</li>
              <li><strong>ALL / FIRE / HEALTH / POLICE Filter Buttons:</strong> Limits the report feed strictly to the chosen service department.</li>
              <li><strong>⏳ Newest ➔ Oldest Button:</strong> Reverses the chronological sorting of the report list.</li>
              <li><strong>Search Input Bar:</strong> Filters reports in real-time by title, citizen name, email, location address, or keywords.</li>
              <li><strong>Location Coordinate Links (📍):</strong> Opens Google Maps directly centered on the recorded incident GPS location.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 text-sm border-b pb-1 flex items-center gap-2">
              🆔 3. ID Verification & Responder Onboarding
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>SELECT APPROVAL ROLE Dropdown:</strong> Selects the official department assignment (e.g. Health, Police, or Fire Responder) before approving an applicant.</li>
              <li><strong>Approve Responder:</strong> Grants official responder status in Firestore and automatically dispatches a welcome email via EmailJS with app authorization instructions.</li>
              <li><strong>Reject Vetting:</strong> Flags the profile as rejected in the database and sends an advisory email notification to the applicant.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 text-sm border-b pb-1 flex items-center gap-2">
              ⚙️ 4. Geospatial Heatmap & Responder Personnel Management
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>🗺️ Heatmap Tab:</strong> Renders an interactive Leaflet map featuring color-coded heat aura rings and severity markers across the municipality.</li>
              <li><strong>👥 Responders Tab:</strong> Opens the active and deactivated user registry table.</li>
              <li><strong>👁️ View Details:</strong> Opens a full profile modal showing uploaded ID cards and account metadata.</li>
              <li><strong>🚫 Deactivate / 🔄 Reactivate Buttons:</strong> Toggles account status with logged administrative notes and reasons.</li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-4 px-6 flex justify-between items-center border-t border-slate-200">
          <button 
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-black text-xs px-5 py-2 rounded-lg uppercase shadow"
          >
            Close Manual
          </button>
        </div>

      </div>
    </div>
  );
}

export default InstructionsManual;