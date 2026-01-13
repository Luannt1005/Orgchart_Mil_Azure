"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import styles from "./login.module.css";
import { EyeIcon, EyeSlashIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

// Supabase client
import { supabase } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";
import { useUser } from "@/app/context/UserContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { setUser } = useUser();

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

      // 6. Save user info to localStorage and context for UI
      // Note: setUser in our context also updates localStorage, but doing it explicitly here first 
      // doesn't hurt and ensures it's available.
      // Actually, relying on setUser context is cleaner if available.
      setUser(userInfo);

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
      <div className={styles['login-container']}>
        <div className={styles['success-container']}>
          <div className={styles['success-icon']}>✓</div>
          <h2>Đăng nhập thành công!</h2>
          <p>Chào mừng quay lại</p>
          <div className={styles['spinner-dots']}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['login-container']}>
      <div className={styles['login-card']}>
        {/* Logo */}
        <div className={styles['login-logo']}>
          <div className={styles['logo-wrapper']}>
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
        <div className={styles['login-header']}>
          <h1>Đăng Nhập</h1>
          <p>Quản lý Sơ đồ Tổ chức</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={`${styles.alert} ${styles['alert-error']}`}>
            <span className={styles['alert-icon']}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className={styles['login-form']}>
          {/* Username Input */}
          <div className={styles['form-group']}>
            <label htmlFor="username">Email</label>
            <div className={styles['input-wrapper']}>
              <input
                id="username"
                type="text"
                placeholder="Nhập email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className={styles['form-input']}
                required
              />
              <span className={styles['input-icon']}>
                <EnvelopeIcon className="w-5 h-5" />
              </span>
            </div>
          </div>

          {/* Password Input */}
          <div className={styles['form-group']}>
            <label htmlFor="password">Mật khẩu</label>
            <div className={styles['input-wrapper']}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={styles['form-input']}
                required
              />
              <button
                type="button"
                className={styles['input-button']}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} className={styles['login-button']}>
            {loading ? (
              <>
                <span className={styles['button-spinner']}></span>
                <span>Đang kiểm tra...</span>
              </>
            ) : (
              <>
                <span>Đăng Nhập</span>
                <span className={styles['button-arrow']}>→</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className={styles['divider-line']}></div>

        {/* Footer Links */}
        <div className={styles['login-footer']}>
          <a href="#forgot" className={styles['footer-link']}>
            Quên mật khẩu?
          </a>
          <a href="/signup" className={styles['footer-link']}>
            Tạo tài khoản
          </a>
        </div>
      </div>

      {/* Background Elements */}
      <div className={`${styles['bg-decoration']} ${styles['bg-1']}`}></div>
      <div className={`${styles['bg-decoration']} ${styles['bg-2']}`}></div>
    </div>
  );
}
