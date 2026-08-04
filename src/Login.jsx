import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import emailjs from "@emailjs/browser";
import { auth } from "./firebase";

// EmailJS Credentials Configuration
const EMAILJS_SERVICE_ID = 'service_id265eu';
const EMAILJS_TEMPLATE_ID = 'template_jj65n7c';
const EMAILJS_PUBLIC_KEY = 'G7C0i2J4eS7lsxFN_';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    // 1. Guard Clause: Prevent rapid double-click dispatches
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      // 2. Authenticate admin credentials with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const adminEmail = userCredential.user.email?.toLowerCase();
      const loginTimestamp = new Date().toLocaleString();

      // 3. Construct professional HTML security notification payload
      const htmlEmailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #334155;">
          
          <!-- Header Bar -->
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 16px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 18px; font-weight: 800;">LGU PORTAL SYSTEM</h2>
            <span style="color: #2563eb; font-size: 11px; font-weight: 700; text-transform: uppercase;">LGU Admin Sign-In Notice</span>
          </div>

          <!-- Alert Body -->
          <p style="font-size: 14px; line-height: 1.5; margin-top: 0;">
            An administrator sign-in was recorded for the <strong>LGU Central Admin Portal</strong> using your account.
          </p>

          <!-- Callout Box -->
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 14px; margin: 16px 0; border-radius: 4px; font-size: 13px;">
            <strong>Login Timestamp:</strong> ${loginTimestamp}
          </div>

          <!-- Contact Details -->
          <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 8px;">
            If you did not perform this login, please contact system administration immediately:
          </p>

          <ul style="font-size: 13px; color: #334155; padding-left: 20px; margin: 0 0 16px 0; line-height: 1.6;">
            <li>Email: <a href="mailto:ethan_josh_nora@dlsl.edu.ph" style="color: #2563eb; font-weight: bold; text-decoration: none;">ethan_josh_nora@dlsl.edu.ph</a></li>
            <li>Phone: <strong>09561237956</strong></li>
          </ul>

          <!-- Footer Disclaimer -->
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 16px 0 10px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
            This is an automated system notification from the LGU Portal System.
          </p>

        </div>
      `;

      // 4. Send email dispatch via EmailJS
      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: adminEmail,
            from_name: "LGU Portal System",
            subject_title: "LGU Portal System - Account Activity Alert",
            message: htmlEmailTemplate,
            reply_to: "ethan_josh_nora@dlsl.edu.ph",
          },
          EMAILJS_PUBLIC_KEY
        );
        console.log("LGU Admin login alert email sent successfully!");
      } catch (emailErr) {
        console.warn("Email alert warning:", emailErr);
      }

      // Success: React state in App.jsx will automatically handle showing the dashboard
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password. Access denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          LGU Admin Portal Login
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lgu.gov.ph"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}