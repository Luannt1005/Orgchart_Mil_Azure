"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import styles from "./signup.module.css";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

// Supabase client
import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Auto-complete domain when typing '@'
    if (value.endsWith('@') && !value.includes('@ttigroup.com.vn')) {
      const parts = value.split('@');
      // Only append if we just typed the @ symbol (checks if there is exactly one @ and it's at the end)
      if (parts.length === 2 && parts[1] === '') {
        value = parts[0] + '@ttigroup.com.vn';
      }
    }

    setEmail(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (!email.endsWith("@ttigroup.com.vn")) {
      setError("Email không hợp lệ");
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
      // 1. Check if email (username) already exists in Supabase
      const { data: existingUsers, error: queryError } = await supabase
        .from('users')
        .select('username')
        .eq('username', email)
        .limit(1);

      if (queryError) {
        console.error("Query error:", queryError);
        throw new Error("Lỗi kết nối database");
      }

      if (existingUsers && existingUsers.length > 0) {
        setError("Email này đã được đăng ký");
        setLoading(false);
        return;
      }

      // 2. Hash password
      const hashedPassword = await hashPassword(password);

      // 3. Insert new user into Supabase
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          username: email, // Use email as username
          password: hashedPassword,
          full_name: fullName,
          role: 'user'
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error("Không thể tạo tài khoản. Vui lòng thử lại.");
      }

      // 4. Show success and redirect
      setSuccess(true);
      setTimeout(() => {
        router.replace("/login");
      }, 2000);

    } catch (err: any) {
      console.error("Signup error:", err);
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
            <img
              src="/Milwaukee-logo-red.png"
              alt="Milwaukee Tool"
              width={200}
              height={90}
              style={{ objectFit: 'contain' }}
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

          {/* Email */}
          <div className={styles['form-group']}>
            <label htmlFor="email">Email</label>
            <div className={styles['input-wrapper']}>
              <input
                id="email"
                type="text" // using text to allow typing @
                placeholder="Nhập email công ty"
                value={email}
                onChange={handleEmailChange}
                disabled={loading}
                className={styles['form-input']}
                required
              />
              <span className={styles['input-icon']}>✉️</span>
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
                onClick={() => setShowPassword(!showPassword)}
                className={styles['input-icon']}
                style={{ pointerEvents: 'auto', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5 text-gray-500" />
                ) : (
                  <EyeIcon className="w-5 h-5 text-gray-500" />
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
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={styles['input-icon']}
                style={{ pointerEvents: 'auto', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="w-5 h-5 text-gray-500" />
                ) : (
                  <EyeIcon className="w-5 h-5 text-gray-500" />
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
