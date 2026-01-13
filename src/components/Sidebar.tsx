'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useUser } from '@/app/context/UserContext';
import { usePathname, useRouter } from 'next/navigation';
import {
    ShareIcon,
    UserGroupIcon,
    ChartBarSquareIcon,
    CloudArrowUpIcon,
    TableCellsIcon,
    PencilSquareIcon,
    Cog6ToothIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { preload } from 'swr';
import { swrFetcher } from '@/lib/api-client';

// API endpoints for prefetching
const API_ENDPOINTS: { [key: string]: string } = {
    '/Dashboard': '/api/sheet',
    '/SheetManager': '/api/sheet',
};

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const { user } = useUser();
    const userRole = user?.role || null;

    const navItems = [
        { name: 'Org Chart', path: '/Orgchart', icon: ShareIcon },
        { name: 'Dashboard', path: '/Dashboard', icon: ChartBarSquareIcon },
        // { name: 'Import HR Data', path: '/Import_HR_Data', icon: CloudArrowUpIcon },
        { name: 'Edit Table HR', path: '/SheetManager', icon: TableCellsIcon },
        { name: 'Headcount Open', path: '/Headcount_open', icon: UserGroupIcon },
        { name: 'Customize Chart', path: '/Customize', icon: PencilSquareIcon },
        { name: 'Admin Console', path: '/Admin', icon: Cog6ToothIcon, requiredRole: 'admin' },
    ].filter(item => !item.requiredRole || item.requiredRole === userRole);

    // Prefetch data when hovering over nav items
    const handleMouseEnter = useCallback((path: string) => {
        const apiEndpoint = API_ENDPOINTS[path];
        if (apiEndpoint) {
            preload(apiEndpoint, swrFetcher);
        }
        // Also prefetch the route
        router.prefetch(path);
    }, [router]);

    // Hide sidebar on auth pages
    if (['/login', '/signup'].includes(pathname)) {
        return null;
    }

    return (
        <>
            {/* Spacer to push content over */}
            <div className={`shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`} />
            <div
                className={`
        fixed left-0 top-0 flex flex-col h-screen bg-gradient-to-b from-[#86010f] to-[#500000] text-white transition-all duration-300 ease-in-out shadow-2xl z-50
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
            >
                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-8 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full p-1.5 text-white shadow-lg border border-white/20 transition-all z-50"
                >
                    {isCollapsed ? <ChevronRightIcon className="w-3 h-3" /> : <ChevronLeftIcon className="w-3 h-3" />}
                </button>

                {/* Brand / Logo */}
                <div className={`h-15 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-white/10 shrink-0`}>
                    {isCollapsed ? (
                        <div className="w-10 h-10 relative">
                            <Image src="/milwaukee_logo.png" alt="Logo" fill className="object-contain brightness-0 invert" unoptimized />
                        </div>
                    ) : (
                        <Link href="/" className="flex items-center justify-center w-full">
                            <div className="relative h-12 w-40">
                                <Image
                                    src="/milwaukee_logo.png"
                                    alt="Milwaukee Logo"
                                    fill
                                    className="object-contain brightness-0 invert filter drop-shadow-md"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    priority
                                    unoptimized
                                />
                            </div>
                        </Link>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                prefetch={true}
                                onMouseEnter={() => handleMouseEnter(item.path)}
                                className={`
                flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden
                ${isActive
                                        ? 'bg-white/15 text-white shadow-inner font-semibold'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white hover:shadow-lg hover:shadow-[#000000]/20'}
                ${isCollapsed ? 'justify-center' : ''}
              `}
                                title={isCollapsed ? item.name : ''}
                            >
                                {/* Active Indicator Line */}
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>}

                                <item.icon className={`w-6 h-6 shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]' : 'group-hover:scale-110'}`} />
                                {!isCollapsed && (
                                    <span className={`ml-3 text-[15px] tracking-wide ${isActive ? 'text-white' : ''}`}>{item.name}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </>
    );
}

