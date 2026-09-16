import React, { useState } from 'react';

/**
 * EulaModal Component - LGU Operations Control Center Edition
 * 
 * Prompts authorized LGU admins and emergency dispatchers to acknowledge
 * operational rules, action logging, and Data Privacy Act (R.A. 10173) terms.
 * 
 * @param {boolean} isOpen - Controls visibility of the modal dialog.
 * @param {function} onAccept - Callback triggered upon user acceptance.
 * @param {function} onDecline - Callback triggered upon user decline (logs out session).
 */
const EulaModal = ({ isOpen, onAccept, onDecline }) => {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center gap-3">
          <span className="text-3xl">📜</span>
          <div>
            <h2 className="text-lg font-extrabold tracking-wider">End-User License Agreement (EULA)</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              LGU Emergency Command Center & Data Privacy Compliance
            </p>
          </div>
        </div>

        {/* Terms Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed font-medium">
          <p className="font-bold text-slate-900">
            Please review and accept the terms of agreement before accessing the LGU Operations Control Center.
          </p>

          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h4 className="font-extrabold text-slate-800 uppercase text-[11px] mb-1">1. Authorization & Access Control</h4>
              <p>
                Access to this command web portal is strictly restricted to authorized Local Government Unit (LGU) emergency dispatchers and administrators. Unauthorized access or sharing of administrative accounts is strictly prohibited.
              </p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-800 uppercase text-[11px] mb-1">2. Data Privacy & Confidentiality (R.A. 10173)</h4>
              <p>
                All emergency report details, citizen contact records, live incident coordinates, and responder verification images accessed through this platform are strictly confidential and protected under Republic Act No. 10173 (Data Privacy Act of 2012).
              </p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-800 uppercase text-[11px] mb-1">3. Action Auditing & System Logs</h4>
              <p>
                All administrative operations—including responder ID approvals, account rejections, case closures, and printed report dispatches—are logged to your authenticated administrator email address.
              </p>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-800 uppercase text-[11px] mb-1">4. Verification Responsibility</h4>
              <p>
                Administrators are required to carefully audit evidence, photographic perspectives, and responder credentials prior to confirming dispatch status or issuing official departmental clearance.
              </p>
            </div>
          </div>

          {/* Mandatory Checkbox */}
          <label className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl cursor-pointer hover:bg-indigo-100/60 transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
            />
            <span className="text-xs font-bold text-indigo-950">
              I have read, understood, and agree to comply with the LGU Command EULA and Data Privacy guidelines.
            </span>
          </label>
        </div>

        {/* Modal Action Controls */}
        <div className="p-4 bg-slate-100 border-t flex justify-end gap-3">
          <button
            onClick={onDecline}
            className="px-5 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 uppercase tracking-wider transition-all cursor-pointer"
          >
            Decline & Sign Out
          </button>
          <button
            disabled={!isChecked}
            onClick={onAccept}
            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-md ${
              isChecked
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            Accept & Continue
          </button>
        </div>

      </div>
    </div>
  );
};

export default EulaModal;