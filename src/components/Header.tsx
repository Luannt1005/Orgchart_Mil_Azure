"use client";

import { useState, useEffect, useRef } from "react";
import {
    MagnifyingGlassIcon,
    BellIcon,
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
    const [user, setUser] = useState<{ username: string; full_name: string; role?: string } | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);



    useEffect(() => {
        // Load user from local storage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Failed to parse user', e);
            }
        }

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
            <div className="h-15 flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
                {/* Search Bar */}
                <div className="hidden sm:block">
                    <form action="#" method="POST">
                        <div className="relative">
                            <button className="absolute left-0 top-1/2 -translate-y-1/2">
                                <MagnifyingGlassIcon className="w-5 h-5 text-muted hover:text-primary transition-colors" />
                            </button>

                            <input
                                type="text"
                                placeholder="Type to search..."
                                className="w-full bg-transparent pl-9 pr-4 text-body focus:outline-none xl:w-125 font-medium placeholder-gray-400"
                            />
                        </div>
                    </form>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-3 2xsm:gap-7">
                    <ul className="flex items-center gap-2 2xsm:gap-4">
                        {/* Dark Mode Toggle */}
                        <li>
                            <button
                                onClick={toggleDarkMode}
                                className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-page)] hover:text-primary transition-all hover:bg-[var(--color-border-light)]"
                            >
                                {isDarkMode ? (
                                    <SunIcon className="w-5 h-5 text-yellow-500" />
                                ) : (
                                    <MoonIcon className="w-5 h-5 text-muted" />
                                )}
                            </button>
                        </li>

                        {/* Notification Bell */}
                        <li>
                            <button className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-page)] hover:text-primary transition-all hover:bg-[var(--color-border-light)]">
                                <span className="absolute -top-0.5 right-0 z-1 h-2 w-2 rounded-full bg-red-600 animate-pulse">
                                    <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-red-600 opacity-75"></span>
                                </span>
                                <BellIcon className="w-5 h-5 text-muted" />
                            </button>
                        </li>
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
