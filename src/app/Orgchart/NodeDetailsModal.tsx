import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useMemo } from 'react';

interface NodeDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodeData: any | null;
    allNodes: any[];
}

export default function NodeDetailsModal({
    isOpen,
    onClose,
    nodeData,
    allNodes = []
}: NodeDetailsModalProps) {

    const stats = useMemo(() => {
        if (!nodeData || !allNodes || allNodes.length === 0) return null;

        const counts = {
            director: 0,
            manager: 0,
            supervisor: 0,
            specialist: 0,
            engineer: 0,
            idl: 0,
            total: 0
        };

        const visited = new Set<string>();
        const queue = [nodeData];
        // Don't count the node itself, so we start processing children immediately
        // Actually the queue approach processes the current node first if we aren't careful.
        // Let's use a function to get children and only add children to traverse.

        // Reset queue to just children of the selected node
        const isGroup = nodeData.tags?.includes('group');
        const initialChildren = allNodes.filter(n =>
            isGroup ? n.stpid === nodeData.id : n.pid === nodeData.id
        );

        const traversalQueue = [...initialChildren];
        initialChildren.forEach(child => visited.add(child.id));

        while (traversalQueue.length > 0) {
            const current = traversalQueue.shift();
            if (!current) continue;

            // If current node is a group, we don't count it in stats, but we traverse its children
            const isStructuralNode = current.tags?.includes('group') || current.tags?.includes('indirect_group');
            const isVacant = current.tags?.includes('headcount_open');

            // Only count if it's a real person (not a group structure and not a vacant position)
            if (!isStructuralNode && !isVacant) {
                const title = (current.title || '').toLowerCase();
                const type = (current.type || '').toLowerCase();

                if (title.includes('director')) counts.director++;
                else if (title.includes('manager')) counts.manager++;
                else if (title.includes('supervisor')) counts.supervisor++;
                else if (title.includes('specialist')) counts.specialist++;
                else if (title.includes('engineer')) counts.engineer++;

                // IDL Check
                if (type === 'idl' || current.tags?.includes('idl')) {
                    counts.idl++;
                }
                counts.total++;
            }

            // Find children of this node
            const isCurrentGroup = current.tags?.includes('group');
            const children = allNodes.filter(n =>
                // If it's a group, get members (stpid). If it's a person/role, get reports (pid).
                // However, usually we just want to follow the hierarchy down.
                // If we are traversing down, and we hit a group, we should probably look for its stpid members.
                // If we hit a person, we look for pid reports.
                isCurrentGroup ? n.stpid === current.id : n.pid === current.id
            );

            for (const child of children) {
                if (!visited.has(child.id)) {
                    visited.add(child.id);
                    traversalQueue.push(child);
                }
            }
        }

        return counts;
    }, [nodeData, allNodes]);

    if (!nodeData) return null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-[var(--color-bg-card)] p-0 text-left align-middle shadow-2xl transition-all border border-[var(--color-border)]">

                                {/* Header / Banner Background */}
                                <div className="h-32 bg-gradient-to-r from-[#DB011C] to-[#8f0012] relative overflow-hidden">
                                    <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none">
                                        {/* Assuming logo is in public folder */}
                                        <img
                                            src="/milwaukee_logo.png"
                                            alt="Milwaukee Tool"
                                            className="h-24 w-auto object-contain"
                                        />
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1 transition-colors z-10"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="px-8 pb-8">
                                    {/* Profile Image - Overlapping Header */}
                                    <div className="relative -mt-16 mb-4 flex justify-center z-10">
                                        <div className="h-32 w-32 rounded-full border-4 border-[var(--color-bg-card)] shadow-lg overflow-hidden bg-[var(--color-bg-card)]">
                                            {nodeData.img ? (
                                                <img
                                                    src={nodeData.img}
                                                    alt={nodeData.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center bg-[var(--color-bg-page)] text-[var(--color-text-muted)]">
                                                    <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Main Info */}
                                    <div className="text-center mb-6">
                                        <h3 className="text-2xl font-bold text-[var(--color-text-title)] leading-tight">
                                            {nodeData.name || "Unnamed"}
                                        </h3>
                                        <p className="text-sm font-semibold text-[#DB011C] uppercase tracking-wide mt-1">
                                            {nodeData.title || "No Title"}
                                        </p>
                                        <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                            {nodeData.dept || "No Department"}
                                        </p>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-[var(--color-border)] w-full mb-6"></div>

                                    {/* HEADCOUNT STATS TAGS - NEW SECTION */}


                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">

                                        <div className="col-span-2 sm:col-span-1">
                                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Employee ID</p>
                                            <p className="font-medium text-[var(--color-text-body)] break-all">{nodeData.id}</p>
                                        </div>

                                        <div className="col-span-2 sm:col-span-1">
                                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Business Unit</p>
                                            <p className="font-medium text-[var(--color-text-body)]">{nodeData.BU || "-"}</p>
                                        </div>

                                        {/* NEW FIELD: Employee Type */}
                                        <div className="col-span-2 sm:col-span-1">
                                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Category</p>
                                            <p className="font-medium text-[var(--color-text-body)]">{nodeData.type || "-"}</p>
                                        </div>

                                        <div className="col-span-2 sm:col-span-1">
                                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Location</p>
                                            <p className="font-medium text-[var(--color-text-body)]">{nodeData.location || "-"}</p>
                                        </div>

                                        <div className="col-span-2 sm:col-span-1">
                                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Joining Date</p>
                                            <p className="font-medium text-[var(--color-text-body)]">{nodeData.joiningDate || "-"}</p>
                                        </div>

                                        {nodeData.description && (
                                            <div className="col-span-2 mt-2">
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Description</p>
                                                <div className="p-3 bg-[var(--color-bg-page)] rounded-lg text-[var(--color-text-body)] text-sm leading-relaxed border border-[var(--color-border)]">
                                                    {nodeData.description}
                                                </div>
                                            </div>
                                        )}

                                        {nodeData.tags && nodeData.tags.length > 0 && (
                                            <div className="col-span-2 mt-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {nodeData.tags.map((tag: string, index: number) => (
                                                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* HEADCOUNT STATS TAGS - Moved to bottom */}
                                    {stats && stats.total > 0 && (
                                        <div className="mt-8 border-t border-[var(--color-border)] pt-6">
                                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 text-center">Span of Control ({stats.total})</p>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {stats.director > 0 && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-[var(--color-text-body)] border border-purple-200 dark:border-purple-800">
                                                        Director: {stats.director}
                                                    </span>
                                                )}
                                                {stats.manager > 0 && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-[var(--color-text-body)] border border-blue-200 dark:border-blue-800">
                                                        Manager: {stats.manager}
                                                    </span>
                                                )}
                                                {stats.supervisor > 0 && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-[var(--color-text-body)] border border-green-200 dark:border-green-800">
                                                        Supervisor: {stats.supervisor}
                                                    </span>
                                                )}
                                                {stats.specialist > 0 && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-[var(--color-text-body)] border border-orange-200 dark:border-orange-800">
                                                        Specialist: {stats.specialist}
                                                    </span>
                                                )}
                                                {stats.engineer > 0 && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-[var(--color-text-body)] border border-teal-200 dark:border-teal-800">
                                                        Engineer: {stats.engineer}
                                                    </span>
                                                )}
                                                {stats.idl > 0 && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-bg-page)] text-[var(--color-text-body)] border border-[var(--color-border)]">
                                                        IDL: {stats.idl}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
