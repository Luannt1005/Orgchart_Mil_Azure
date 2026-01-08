"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import "./login.css";

// Supabase client
import { supabase } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Find user in Supabase by username
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .limit(1);

      if (queryError) {
        console.error("Query error:", queryError);
        throw new Error("Lỗi kết nối database");
      }

      if (!users || users.length === 0) {
        setError("Sai tài khoản hoặc mật khẩu");
        setLoading(false);
        return;
      }

      // 2. Get user data
      const userData = users[0];

      // 3. Verify password with bcrypt
      const isPasswordValid = await verifyPassword(password, userData.password);
      if (!isPasswordValid) {
        setError("Sai tài khoản hoặc mật khẩu");
        setLoading(false);
        return;
      }

      // 4. Create user info object
      const userInfo = {
        id: userData.id,
        username: userData.username,
        full_name: userData.full_name || userData.username,
        role: userData.role || "user"
      };

      // 5. Create session via API
      const sessionRes = await fetch("/api/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userInfo })
      });

      const sessionData = await sessionRes.json();

      if (!sessionData.success) {
        throw new Error("Failed to create session");
      }

      // 6. Save user info to localStorage (for UI)
      localStorage.setItem("user", JSON.stringify(userInfo));

      // ✅ Show success animation
      setSuccess(true);

      // Redirect after animation
      setTimeout(() => {
        router.replace("/");
      }, 2000);

    } catch (err: any) {
      console.error("Login error:", err);
      let msg = "Lỗi kết nối. Vui lòng thử lại.";

      if (err.message) {
        msg = err.message;
      }

      setError(msg);
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="login-container">
        <div className="success-container">
          <div className="success-icon">✓</div>
          <h2>Đăng nhập thành công!</h2>
          <p>Chào mừng quay lại</p>
          <div className="spinner-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="logo-wrapper">
            <Image
              src="/Milwaukee-logo-red.png"
              width={200}
              height={90}
              alt="Milwaukee Tool"
              style={{ objectFit: 'contain' }}
              priority
              unoptimized
            />
          </div>
        </div>

        {/* Header */}
        <div className="login-header">
          <h1>Đăng Nhập</h1>
          <p>Quản lý Sơ đồ Tổ chức</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* Username Input */}
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <div className="input-wrapper">
              <input
                id="username"
                type="text"
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="form-input"
                required
              />
              <span className="input-icon">👤</span>
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <div className="input-wrapper">
              <input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="form-input"
                required
              />
              <span className="input-icon">🔒</span>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <>
                <span className="button-spinner"></span>
                <span>Đang kiểm tra...</span>
              </>
            ) : (
              <>
                <span>Đăng Nhập</span>
                <span className="button-arrow">→</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="divider-line"></div>

        {/* Footer Links */}
        <div className="login-footer">
          <a href="#forgot" className="footer-link">
            Quên mật khẩu?
          </a>
          <a href="/signup" className="footer-link">
            Tạo tài khoản
          </a>
        </div>
      </div>

      {/* Background Elements */}
      <div className="bg-decoration bg-1"></div>
      <div className="bg-decoration bg-2"></div>
    </div>
  );
}
