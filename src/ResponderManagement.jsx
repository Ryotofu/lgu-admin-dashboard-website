import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';

export default function ResponderManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [firestoreError, setFirestoreError] = useState(null);
  
  // View Filters
  const [viewTab, setViewTab] = useState('active'); // 'active' | 'deactivated'
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'RESPONDER' | 'CITIZEN'

  // Deactivation Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 🆔 View User ID / Profile Details Modal State
  const [viewingUser, setViewingUser] = useState(null);

  // 🛠️ Helper: Safely formats Base64 strings or HTTP URLs for <img src="..." />
  const getBase64ImageSrc = (imageData) => {
    if (!imageData) return null;
    if (imageData.startsWith('data:') || imageData.startsWith('http')) {
      return imageData;
    }
    return `data:image/jpeg;base64,${imageData}`;
  };

  // Helper: Classify user role cleanly
  const getUserRoleCategory = (data) => {
    const role = String(data.role || data.userType || data.accountType || '').toUpperCase();
    const requestedRole = String(data.requestedRole || '').toUpperCase();
    const department = String(data.department || '').toUpperCase();
    const idStatus = String(data.idStatus || data.status || '').toUpperCase();

    const isResponder = 
      role.includes('RESPONDER') || 
      role.includes('POLICE') || 
      role.includes('FIRE') || 
      role.includes('MEDICAL') || 
      requestedRole.includes('RESPONDER') ||
      department.length > 0 ||
      (idStatus === 'APPROVED' && role !== 'CITIZEN');

    return isResponder ? 'RESPONDER' : 'CITIZEN';
  };

  // 1. Fetch All User Accounts (Responders & Citizens) from Firestore
  useEffect(() => {
    setLoading(true);
    setFirestoreError(null);

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (querySnapshot) => {
        const loadedUsers = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const determinedRole = getUserRoleCategory(data);

          loadedUsers.push({
            id: docSnap.id,
            computedRole: determinedRole,
            ...data,
          });
        });

        setUsers(loadedUsers);
        setLoading(false);
      },
      (error) => {
        console.error("❌ [Firestore Error]:", error);
        setFirestoreError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Update default reason when a user is selected for deactivation
  useEffect(() => {
    if (selectedUser) {
      if (selectedUser.computedRole === 'CITIZEN') {
        setDeactivationReason('Spam / False Incident Reporting');
      } else {
        setDeactivationReason('Retired / Honorably Discharged');
      }
    }
  }, [selectedUser]);

  // 2. Handle Account Deactivation
  const handleConfirmDeactivation = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);

    try {
      const userRef = doc(db, 'users', selectedUser.id);
      
      await updateDoc(userRef, {
        status: 'deactivated',
        isActive: false,
        idStatus: 'Deactivated',
        deactivatedAt: serverTimestamp(),
        deactivationReason: deactivationReason,
        deactivationNote: customNote,
      });

      setSelectedUser(null);
      setViewingUser(null);
      setCustomNote('');
    } catch (error) {
      console.error("Error deactivating user:", error);
      alert("Failed to deactivate account.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Handle Account Reactivation
  const handleReactivate = async (userToReactivate) => {
    const nameStr = userToReactivate.fullName || userToReactivate.email || 'this user';
    if (!window.confirm(`Reactivate account for ${nameStr}?`)) return;

    try {
      const userRef = doc(db, 'users', userToReactivate.id);
      await updateDoc(userRef, {
        status: 'active',
        isActive: true,
        idStatus: 'Approved',
        reactivatedAt: serverTimestamp(),
      });
      setViewingUser(null);
    } catch (error) {
      console.error("Error reactivating user:", error);
      alert("Failed to reactivate account.");
    }
  };

  // Filter logic for tabs, role dropdown, and search bar
  const filteredUsers = users.filter((u) => {
    const isDeactivated = u.status === 'deactivated' || u.isActive === false;
    const matchesTab = viewTab === 'active' ? !isDeactivated : isDeactivated;

    const matchesRole = roleFilter === 'ALL' || u.computedRole === roleFilter;

    const text = (
      (u.fullName || u.name || '') + ' ' +
      (u.email || '') + ' ' +
      (u.department || u.role || u.requestedRole || '') + ' ' +
      u.computedRole
    ).toLowerCase();

    const matchesSearch = text.includes(searchTerm.toLowerCase());
    return matchesTab && matchesRole && matchesSearch;
  });

  const activeCount = users.filter((u) => u.status !== 'deactivated' && u.isActive !== false).length;
  const deactivatedCount = users.filter((u) => u.status === 'deactivated' || u.isActive === false).length;

  return (
    /* 👈 Added data-tour attribute to the root element below */
    <div data-tour="responder-management-panel" className="space-y-4">
      {/* ERROR DISPLAY BADGE */}
      {firestoreError && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl text-xs font-bold">
          ⚠️ Firestore Permission or Connection Error: {firestoreError}
        </div>
      )}

      {/* TOP CONTROL TOOLBAR & TABS */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <span>🛡️</span> User & Responder Personnel Registry
            </h3>
            <p className="text-[11px] text-slate-400">
              Manage LGU active and deactivated accounts for both Citizens and Responders.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {/* Role Filter Selector */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">👥 All User Roles</option>
              <option value="RESPONDER">🚒 Responders Only</option>
              <option value="CITIZEN">🏛️ Citizens Only</option>
            </select>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search name, email, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 w-full md:w-64"
            />
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewTab('active')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                viewTab === 'active'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🟢</span> Active Accounts ({activeCount})
            </button>

            <button
              onClick={() => setViewTab('deactivated')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                viewTab === 'deactivated'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔴</span> Deactivated Accounts ({deactivatedCount})
            </button>
          </div>

          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">
            Showing {roleFilter} ({viewTab.toUpperCase()})
          </span>
        </div>
      </div>

      {/* TABLE DATA */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
            <span className="animate-spin text-xl">⏳</span> Reading Firestore Records...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <span className="text-3xl">{viewTab === 'active' ? '🟢' : '🔴'}</span>
            <p className="text-xs font-black uppercase tracking-wider">
              No {viewTab} {roleFilter !== 'ALL' ? roleFilter.toLowerCase() : ''} accounts found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-300 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                  <th className="p-3.5">User Full Name</th>
                  <th className="p-3.5">Registered Email</th>
                  <th className="p-3.5">Account Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredUsers.map((userItem) => {
                  const isDeactivated = userItem.status === 'deactivated' || userItem.isActive === false;

                  return (
                    <tr 
                      key={userItem.id} 
                      className={`hover:bg-slate-100/80 transition-colors cursor-pointer ${
                        isDeactivated ? 'bg-red-50/30' : ''
                      }`}
                      onClick={() => setViewingUser(userItem)}
                    >
                      <td className="p-3.5">
                        <strong className="block font-black text-slate-900 uppercase hover:text-blue-600 transition-colors">
                          {userItem.fullName || userItem.name || 'Unnamed User'}
                        </strong>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          ID: {userItem.id.substring(0, 8)}...
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-slate-700">
                        {userItem.email || 'No email registered'}
                      </td>

                      <td className="p-3.5">
                        {userItem.computedRole === 'RESPONDER' ? (
                          <span className="bg-blue-100 text-blue-800 font-extrabold text-[10px] px-2.5 py-1 rounded-md uppercase border border-blue-200">
                            🚒 {userItem.role || userItem.department || 'RESPONDER'}
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2.5 py-1 rounded-md uppercase border border-emerald-200">
                            🏛️ CITIZEN
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {isDeactivated ? (
                          <span className="bg-red-100 text-red-700 border border-red-200 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                            🔴 Deactivated
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                            🟢 Active
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setViewingUser(userItem)}
                          className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-lg shadow-sm transition-all"
                        >
                          👁️ View Details
                        </button>

                        {isDeactivated ? (
                          <button
                            onClick={() => handleReactivate(userItem)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-lg shadow-sm transition-all"
                          >
                            🔄 Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedUser(userItem)}
                            className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-lg shadow-sm transition-all"
                          >
                            🚫 Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🆔 USER DETAILS & ID MODAL */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 space-y-0">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🪪</span>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-100">
                    User Account & Identification
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {viewingUser.computedRole} Credentials & Document Proof
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-white text-lg font-black bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* ID Image Display */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  Official Identification Document
                </label>
                
                {getBase64ImageSrc(viewingUser.idImageBase64 || viewingUser.idUrl || viewingUser.idPhoto) ? (
                  <div className="relative border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-900 group">
                    <img
                      src={getBase64ImageSrc(viewingUser.idImageBase64 || viewingUser.idUrl || viewingUser.idPhoto)}
                      alt="Valid Identification Document"
                      className="w-full h-64 object-contain bg-slate-950 transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        console.error("Failed to render image data for user:", viewingUser.id);
                      }}
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 space-y-1">
                    <span className="text-3xl block">📷</span>
                    <p className="text-xs font-bold text-slate-600 uppercase">No ID Image Uploaded</p>
                    <p className="text-[10px] text-slate-400">No identification image data is attached to this account.</p>
                  </div>
                )}
              </div>

              {/* User Profile Details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400">Full Name</span>
                  <strong className="text-slate-900 font-extrabold text-sm block">
                    {viewingUser.fullName || viewingUser.name || 'N/A'}
                  </strong>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400">Registered Email</span>
                  <strong className="text-slate-800 font-bold block truncate">
                    {viewingUser.email || 'N/A'}
                  </strong>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400">Role Category</span>
                  <span className={`inline-block mt-0.5 font-extrabold text-[10px] px-2 py-0.5 rounded uppercase border ${
                    viewingUser.computedRole === 'RESPONDER' 
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {viewingUser.computedRole === 'RESPONDER' 
                      ? `🚒 ${viewingUser.role || viewingUser.department || 'RESPONDER'}` 
                      : '🏛️ CITIZEN'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400">Account Status</span>
                  <span className="inline-block mt-0.5 font-black text-[10px] uppercase">
                    {viewingUser.status === 'deactivated' || viewingUser.isActive === false ? (
                      <span className="text-red-600">🔴 Deactivated</span>
                    ) : (
                      <span className="text-emerald-600">🟢 Active</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Display Reason if Deactivated */}
              {(viewingUser.status === 'deactivated' || viewingUser.isActive === false) && viewingUser.deactivationReason && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs space-y-1">
                  <span className="block text-[10px] font-black uppercase text-red-600">Deactivation Reason</span>
                  <p className="font-bold text-red-900">{viewingUser.deactivationReason}</p>
                  {viewingUser.deactivationNote && (
                    <p className="text-[11px] text-red-700 italic">"{viewingUser.deactivationNote}"</p>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 p-4 px-6 flex items-center justify-between border-t border-slate-200">
              <button
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 rounded-lg text-xs font-black uppercase text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>

              {viewingUser.status === 'deactivated' || viewingUser.isActive === false ? (
                <button
                  onClick={() => handleReactivate(viewingUser)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase px-4 py-2 rounded-lg shadow transition-all"
                >
                  🔄 Reactivate Account
                </button>
              ) : (
                <button
                  onClick={() => setSelectedUser(viewingUser)}
                  className="bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase px-4 py-2 rounded-lg shadow transition-all"
                >
                  🚫 Deactivate Account
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 🚫 DEACTIVATION MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <span className="text-3xl p-2 bg-red-100 rounded-xl">🚫</span>
              <div>
                <h3 className="font-black text-slate-900 uppercase text-sm">
                  Deactivate {selectedUser.computedRole === 'CITIZEN' ? 'Citizen' : 'Responder'} Account
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  {selectedUser.email || selectedUser.fullName}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Deactivation Category:
                </label>
                <select
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 font-bold text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                >
                  {selectedUser.computedRole === 'CITIZEN' ? (
                    <>
                      <option value="Spam / False Incident Reporting">Spam / False Incident Reporting</option>
                      <option value="Terms of Service Violation">Terms of Service Violation</option>
                      <option value="Duplicate or Fake Account">Duplicate or Fake Account</option>
                      <option value="Abusive Language or Harassment">Abusive Language or Harassment</option>
                      <option value="Citizen Requested Account Closure">Citizen Requested Account Closure</option>
                      <option value="Other Administrative Grounds">Other Administrative Grounds</option>
                    </>
                  ) : (
                    <>
                      <option value="Retired / Honorably Discharged">Retired / Honorably Discharged</option>
                      <option value="MIA / Prolonged Inactivity">MIA / Prolonged Inactivity</option>
                      <option value="Unverified / False Responder">Unverified / False Responder</option>
                      <option value="Administrative Policy Violation">Administrative Policy Violation</option>
                      <option value="Other Administrative Grounds">Other Administrative Grounds</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Internal Notes (Optional):
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional context for administrative log..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedUser(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeactivation}
                disabled={isProcessing}
                className="px-5 py-2 rounded-lg text-xs font-black uppercase bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}