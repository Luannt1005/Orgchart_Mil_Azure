"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import styles from "./signup.module.css";
import { EyeIcon, EyeSlashIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

// Supabase client
import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailSuggestion, setShowEmailSuggestion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!fullName || !username || !password || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    // Email validation
    if (!username.endsWith('@ttigroup.com.vn')) {
      setError("Email phải kết thúc bằng @ttigroup.com.vn");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu không trùng khớp");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          full_name: fullName
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Không thể tạo tài khoản");
      }

      // 4. Show success and redirect
      setSuccess(true);
      setTimeout(() => {
        router.replace("/login");
      }, 2000);

    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Lỗi kết nối. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className={styles['signup-container']}>
        <div className={styles['success-container']}>
          <div className={styles['success-icon']}>✓</div>
          <h2>Tạo tài khoản thành công!</h2>
          <p>Chuyển hướng đến trang đăng nhập...</p>
          <div className={styles['spinner-dots']}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        {/* Background Elements */}
        <div className={`${styles['bg-decoration']} ${styles['bg-1']}`}></div>
        <div className={`${styles['bg-decoration']} ${styles['bg-2']}`}></div>
      </div>
    );
  }

  return (
    <div className={styles['signup-container']}>
      <div className={styles['signup-card']}>
        {/* Logo */}
        <div className={styles['signup-logo']}>
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
        <div className={styles['signup-header']}>
          <h1>Tạo Tài Khoản</h1>
          <p>Quản lý Sơ đồ Tổ chức</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={`${styles.alert} ${styles['alert-error']}`}>
            <span className={styles['alert-icon']}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles['signup-form']}>
          {/* Full Name */}
          <div className={styles['form-group']}>
            <label htmlFor="fullName">Họ và tên</label>
            <div className={styles['input-wrapper']}>
              <input
                id="fullName"
                type="text"
                placeholder="Nhập họ và tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className={styles['form-input']}
                required
              />
              <span className={styles['input-icon']}>👤</span>
            </div>
          </div>

          {/* Email Input */}
          <div className={styles['form-group']}>
            <label htmlFor="username">Email</label>
            <div className={styles['input-wrapper']}>
              <input
                id="username"
                type="text"
                placeholder="Nhập email"
                value={username}
                onChange={(e) => {
                  const val = e.target.value;
                  setUsername(val);
                  if (val.endsWith('@') && !val.includes('@ttigroup.com.vn')) {
                    setShowEmailSuggestion(true);
                  } else if (!val.includes('@')) {
                    setShowEmailSuggestion(false);
                  }
                }}
                disabled={loading}
                className={styles['form-input']}
                required
              />
              <span className={styles['input-icon']}>
                <EnvelopeIcon className="w-5 h-5" />
              </span>

              {showEmailSuggestion && (
                <button
                  type="button"
                  onClick={() => {
                    setUsername(username + "ttigroup.com.vn");
                    setShowEmailSuggestion(false);
                  }}
                  className={styles['email-suggestion']}
                >
                  <span>Gợi ý: <strong>{username}ttigroup.com.vn</strong></span>
                </button>
              )}
            </div>
          </div>

          {/* Password */}
          <div className={styles['form-group']}>
            <label htmlFor="password">Mật khẩu</label>
            <div className={styles['input-wrapper']}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
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

          {/* Confirm Password */}
          <div className={styles['form-group']}>
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <div className={styles['input-wrapper']}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className={styles['form-input']}
                required
              />
              <button
                type="button"
                className={styles['input-button']}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} className={styles['signup-button']}>
            {loading ? (
              <>
                <span className={styles['button-spinner']}></span>
                <span>Đang tạo...</span>
              </>
            ) : (
              <>
                <span>Tạo Tài Khoản</span>
                <span className={styles['button-arrow']}>→</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className={styles['divider-line']}></div>

        {/* Footer Links */}
        <div className={styles['signup-footer']}>
          <span className={styles['footer-text']}>Đã có tài khoản?</span>
          <Link href="/login" className={styles['footer-link']}>
            Đăng nhập
          </Link>
        </div>
      </div>

      {/* Background Elements */}
      <div className={`${styles['bg-decoration']} ${styles['bg-1']}`}></div>
      <div className={`${styles['bg-decoration']} ${styles['bg-2']}`}></div>
    </div>
  );
}
