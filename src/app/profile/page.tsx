"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/app/context/UserContext";
import styles from "./profile.module.css";
import {
    UserCircleIcon,
    KeyIcon,
    ShieldCheckIcon,
    EyeIcon,
    EyeSlashIcon,
    CheckCircleIcon,
    ExclamationCircleIcon
} from "@heroicons/react/24/outline";

export default function ProfilePage() {
    const { user, setUser } = useUser();

    // Info State
    const [fullName, setFullName] = useState("");
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [msgInfo, setMsgInfo] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Password State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loadingPass, setLoadingPass] = useState(false);
    const [msgPass, setMsgPass] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Password Visibility
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || "");
        }
    }, [user]);

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsgInfo(null);

        if (!user) return;
        if (!fullName.trim()) {
            setMsgInfo({ type: 'error', text: "Họ tên không được để trống" });
            return;
        }

        setLoadingInfo(true);
        try {
            const res = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, fullName })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message || "Lỗi cập nhật");

            // Update local context
            setUser({ ...user, full_name: fullName });
            setMsgInfo({ type: 'success', text: "Cập nhật thông tin thành công!" });

        } catch (error: any) {
            setMsgInfo({ type: 'error', text: error.message });
        } finally {
            setLoadingInfo(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsgPass(null);

        if (!user) return;
        if (!currentPassword || !newPassword || !confirmPassword) {
            setMsgPass({ type: 'error', text: "Vui lòng nhập đầy đủ thông tin" });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMsgPass({ type: 'error', text: "Mật khẩu mới không trùng khớp" });
            return;
        }

        if (newPassword.length < 6) {
            setMsgPass({ type: 'error', text: "Mật khẩu mới phải có ít nhất 6 ký tự" });
            return;
        }

        setLoadingPass(true);
        try {
            const res = await fetch('/api/profile/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    currentPassword,
                    newPassword
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message || "Lỗi đổi mật khẩu");

            setMsgPass({ type: 'success', text: "Đổi mật khẩu thành công!" });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            // Optionally close modal after success? Let's keep it open so they see the success message.

        } catch (error: any) {
            setMsgPass({ type: 'error', text: error.message });
        } finally {
            setLoadingPass(false);
        }
    };

    if (!user) {
        return (
            <div className={styles['profile-container']}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['profile-container']}>
            <h1 className={styles['page-title']}>
                <UserCircleIcon className="w-8 h-8 text-black" />
                Quản Lý Hồ Sơ
            </h1>

            <div className={styles['profile-grid']}>

                {/* --- PERSONAL INFO CARD --- */}
                <div className={styles['card']} style={{ maxWidth: '600px', width: '100%' }}>
                    <div className={styles['card-header']}>
                        <h2 className={styles['card-title']}>
                            <ShieldCheckIcon className="w-6 h-6 text-red-700" />
                            Thông tin cá nhân
                        </h2>
                        <p className={styles['card-description']}>
                            Quản lý thông tin hiển thị và vai trò của bạn
                        </p>
                    </div>

                    {msgInfo && (
                        <div className={`${styles.alert} ${msgInfo.type === 'success' ? styles['alert-success'] : styles['alert-error']}`}>
                            {msgInfo.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationCircleIcon className="w-5 h-5" />}
                            {msgInfo.text}
                        </div>
                    )}

                    <form onSubmit={handleUpdateInfo}>
                        <div className={styles['form-group']}>
                            <label className={styles['form-label']}>Tài khoản (Email)</label>
                            <input
                                type="text"
                                className={styles['form-input']}
                                value={user.username}
                                disabled
                            />
                            <p className="text-xs text-gray-400 mt-1">Không thể thay đổi email đăng nhập</p>
                        </div>

                        <div className={styles['form-group']}>
                            <label className={styles['form-label']}>Vai trò (Role)</label>
                            <span className={`${styles['role-badge']} ${styles[user.role] || ''}`}>
                                {user.role?.toUpperCase() || 'USER'}
                            </span>
                        </div>

                        <div className={styles['form-group']}>
                            <label className={styles['form-label']}>Họ và tên</label>
                            <input
                                type="text"
                                className={styles['form-input']}
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Nhập họ và tên của bạn"
                            />
                        </div>

                        <button
                            type="submit"
                            className={styles['btn-primary']}
                            disabled={loadingInfo}
                        >
                            {loadingInfo ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            className={styles['btn-outline']}
                            onClick={() => setIsPasswordModalOpen(true)}
                        >
                            <KeyIcon className="w-5 h-5" />
                            Đổi Mật Khẩu
                        </button>
                    </div>
                </div>

            </div>

            {/* --- CHANGE PASSWORD MODAL --- */}
            {isPasswordModalOpen && (
                <div className={styles['modal-overlay']} onClick={() => setIsPasswordModalOpen(false)}>
                    <div className={styles['modal-content']} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles['close-btn']}
                            onClick={() => setIsPasswordModalOpen(false)}
                            title="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className={styles['card-header']}>
                            <h2 className={styles['card-title']}>
                                <KeyIcon className="w-6 h-6 text-red-700" />
                                Đổi mật khẩu
                            </h2>
                            <p className={styles['card-description']}>
                                Cập nhật mật khẩu định kỳ để bảo vệ tài khoản
                            </p>
                        </div>

                        {msgPass && (
                            <div className={`${styles.alert} ${msgPass.type === 'success' ? styles['alert-success'] : styles['alert-error']}`}>
                                {msgPass.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationCircleIcon className="w-5 h-5" />}
                                {msgPass.text}
                            </div>
                        )}

                        <form onSubmit={handleChangePassword}>
                            {/* Current Password */}
                            <div className={styles['form-group']}>
                                <label className={styles['form-label']}>Mật khẩu hiện tại</label>
                                <div className="relative">
                                    <input
                                        type={showCurrent ? "text" : "password"}
                                        className={styles['form-input']}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Nhập mật khẩu hiện tại"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showCurrent ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div className={styles['form-group']}>
                                <label className={styles['form-label']}>Mật khẩu mới</label>
                                <div className="relative">
                                    <input
                                        type={showNew ? "text" : "password"}
                                        className={styles['form-input']}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Nhập mật khẩu mới (min 6 ký tự)"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showNew ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className={styles['form-group']}>
                                <label className={styles['form-label']}>Xác nhận mật khẩu mới</label>
                                <div className="relative">
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        className={styles['form-input']}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Nhập lại mật khẩu mới"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showConfirm ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className={styles['btn-primary']}
                                disabled={loadingPass}
                            >
                                {loadingPass ? "Đang xử lý..." : "Đổi mật khẩu"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
