"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/app/context/UserContext";
import {
    UserCircleIcon,
    BriefcaseIcon,
    IdentificationIcon,
    LockClosedIcon,
    KeyIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";

interface ProfileData {
    username: string;
    full_name: string;
    role: string;
    employee_id: string;
    title: string;
}

export default function ProfilePage() {
    const { user, setUser } = useUser();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [changingPass, setChangingPass] = useState(false);

    const [profile, setProfile] = useState<ProfileData>({
        username: "",
        full_name: "",
        role: "",
        employee_id: "",
        title: "",
    });

    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Fetch profile data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/profile');
                const data = await res.json();

                if (data.success && data.data) {
                    setProfile({
                        username: data.data.username || "",
                        full_name: data.data.full_name || "",
                        role: data.data.role || "",
                        employee_id: data.data.employee_id || "",
                        title: data.data.title || "",
                    });
                }
            } catch (error) {
                console.error("Failed to load profile", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            });
            const result = await res.json();

            if (result.success) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                // Update global context
                if (user) {
                    setUser({ ...user, full_name: profile.full_name, role: profile.role });
                }
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An error occurred' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalMessage(null);

        if (passwords.newPassword !== passwords.confirmPassword) {
            setModalMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (passwords.newPassword.length < 6) {
            setModalMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setChangingPass(true);

        try {
            const res = await fetch('/api/profile/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwords.currentPassword,
                    newPassword: passwords.newPassword
                })
            });
            const result = await res.json();

            if (result.success) {
                setModalMessage({ type: 'success', text: 'Password changed successfully!' });
                setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });

                // Close modal after success (optional delay)
                setTimeout(() => {
                    setShowPasswordModal(false);
                    setModalMessage(null);
                }, 1500);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            setModalMessage({ type: 'error', text: error.message || 'An error occurred' });
        } finally {
            setChangingPass(false);
        }
    };

    const openPasswordModal = () => {
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setModalMessage(null);
        setShowPasswordModal(true);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 dark:bg-gray-900 transition-colors duration-200">
            <div className="mx-auto max-w-5xl space-y-8">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <UserCircleIcon className="h-10 w-10 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
                        <p className="text-gray-500 dark:text-gray-400">Manage your personal information and security</p>
                    </div>
                </div>

                {/* Message Toast (Global) */}
                {message && (
                    <div className={`rounded-lg p-4 transition-all duration-300 ${message.type === 'success'
                            ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                        }`}>
                        <div className="flex items-center">
                            <span className="mr-2 text-xl">{message.type === 'success' ? '✓' : '⚠'}</span>
                            {message.text}
                        </div>
                    </div>
                )}

                <div className="grid gap-8 md:grid-cols-3">
                    {/* Left Column: Personal Info (Wider) */}
                    <div className="md:col-span-2 space-y-6">
                        <form onSubmit={handleProfileUpdate} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">General Information</h2>
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium 
                                    ${profile.role === 'admin'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                    {profile.role?.toUpperCase() || 'USER'}
                                </span>
                            </div>

                            <div className="grid gap-6">
                                {/* Email & Role Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            Email Account
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.username}
                                            disabled
                                            className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            Role
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.role?.toUpperCase()}
                                            disabled
                                            className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                                        />
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>

                                {/* Editable Fields */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <UserCircleIcon className="w-4 h-4" /> Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.full_name}
                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <BriefcaseIcon className="w-4 h-4" /> Job Title
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.title}
                                            onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="e.g. Manager"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <IdentificationIcon className="w-4 h-4" /> Employee ID
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.employee_id}
                                            onChange={(e) => setProfile({ ...profile, employee_id: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="e.g. VN12345"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-70 dark:focus:ring-offset-gray-900"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Security Summary */}
                    <div className="space-y-6">
                        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                            <div className="mb-4 flex items-center gap-2">
                                <LockClosedIcon className="h-5 w-5 text-gray-500" />
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                Update your password regularly to keep your account secure.
                            </p>

                            <button
                                type="button"
                                onClick={openPasswordModal}
                                className="w-full inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                                <KeyIcon className="mr-2 h-4 w-4" />
                                Change Password
                            </button>
                        </div>

                        {/* Security Tip */}
                        <div className="rounded-xl bg-blue-50 p-6 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Security Tip</h3>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                Your password is encrypted. Never share your credentials with anyone.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <LockClosedIcon className="w-5 h-5 text-red-600" />
                                Change Password
                            </h3>
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                            {modalMessage && (
                                <div className={`rounded-lg p-3 text-sm ${modalMessage.type === 'success'
                                        ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300'
                                    }`}>
                                    {modalMessage.text}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        value={passwords.currentPassword}
                                        onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={passwords.newPassword}
                                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={passwords.confirmPassword}
                                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={changingPass}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70 dark:focus:ring-offset-gray-900"
                                >
                                    {changingPass ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
