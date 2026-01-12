"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@/app/context/UserContext";
import {
    SunIcon,
    MoonIcon,
    ArrowLeftOnRectangleIcon,
    UserCircleIcon,
    ChevronDownIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
    const pathname = usePathname();
    const { user } = useUser();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        // Initialize dark mode from sync or local storage
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }

        // Close dropdown when clicking outside
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode(prev => {
            const newMode = !prev;
            if (newMode) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            return newMode;
        });
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            localStorage.removeItem('user');
            window.location.href = '/login';
        } catch (e) {
            console.error(e);
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    };

    // Hide header on auth pages
    if (['/login', '/signup'].includes(pathname)) {
        return null;
    }

    return (
        <header className="sticky top-0 z-40 flex w-full bg-[var(--color-bg-card)] drop-shadow-1 border-b border-[var(--color-border)] shadow-md">
            <div className="h-15 flex flex-grow items-center justify-end px-4 py-4 shadow-2 md:px-6 2xl:px-11">
                {/* Search Bar */}
                {/* Right Side */}
                <div className="flex items-center gap-3 2xsm:gap-7">
                    <ul className="flex items-center gap-2 2xsm:gap-4">
                        {/* Dark Mode Toggle */}
                        <li>
                            <label className={`
                                relative m-0 block h-7.5 w-14 rounded-full cursor-pointer transition-colors duration-300 ease-in-out
                                ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'}
                            `}>
                                <input
                                    type="checkbox"
                                    onChange={toggleDarkMode}
                                    className="absolute m-0 h-0 w-0 opacity-0 z-0"
                                    checked={isDarkMode}
                                />
                                <span
                                    className={`
                                        absolute top-1/2 left-[3px] flex h-6 w-6 -translate-y-1/2 translate-x-0 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out
                                        ${isDarkMode && 'translate-x-[26px]'}
                                    `}
                                >
                                    {isDarkMode ? (
                                        <MoonIcon className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <SunIcon className="h-4 w-4 text-yellow-500" />
                                    )}
                                </span>
                            </label>
                        </li>

                        {/* Notification Bell */}

                    </ul>

                    {/* User Area */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-4"
                        >
                            <span className="hidden text-right lg:block">
                                <span className="block text-sm font-medium text-title">
                                    {user?.full_name || 'Loading...'}
                                </span>
                                <span className="block text-xs font-medium text-muted">
                                    {user?.role || 'User'}
                                </span>
                            </span>

                            <span className="h-10 w-10 rounded-full overflow-hidden bg-[var(--color-bg-page)] border border-[var(--color-border)]">
                                <div className="w-full h-full flex items-center justify-center text-muted font-bold text-lg bg-[var(--color-bg-page)]">
                                    {user?.full_name?.charAt(0).toUpperCase() || <UserCircleIcon className="w-8 h-8" />}
                                </div>
                            </span>

                            <ChevronDownIcon className={`w-4 h-4 text-muted transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Start */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-4 w-48 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                <ul className="flex flex-col gap-1 border-b border-[var(--color-border)] py-2">
                                    <li>
                                        <Link
                                            href="/profile"
                                            className="flex items-center gap-3.5 px-6 py-2 text-sm font-medium duration-300 ease-in-out hover:text-primary hover:bg-[var(--color-bg-page)] lg:text-base text-body"
                                        >
                                            <UserCircleIcon className="w-5 h-5" />
                                            My Profile
                                        </Link>
                                    </li>
                                </ul>
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-3.5 px-6 py-3 text-sm font-medium duration-300 ease-in-out hover:text-primary hover:bg-[var(--color-bg-page)] lg:text-base text-red-600 hover:text-red-700"
                                >
                                    <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                                    Log Out
                                </button>
                            </div>
                        )}
                        {/* Dropdown End */}
                    </div>
                </div>
            </div>
        </header>
    );
}
