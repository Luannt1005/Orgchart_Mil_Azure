import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';

interface EditNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (nodeId: string, data: any) => void;
    onDelete?: (nodeId: string) => void;
    onMove?: (nodeId: string, direction: 'left' | 'right') => void;
    nodeData: any | null;
    allNodes: any[]; // For auto-mapping
}

export default function EditNodeModal({
    isOpen,
    onClose,
    onSave,
    onDelete,
    onMove,
    nodeData,
    allNodes
}: EditNodeModalProps) {
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (nodeData) {
            setFormData({
                id: nodeData.id || '',
                pid: nodeData.pid || null,
                stpid: nodeData.stpid || null,
                name: nodeData.name || '',
                title: nodeData.title || '',
                img: nodeData.img || nodeData.photo || nodeData.image || '',
                dept: nodeData.dept || '',
                description: nodeData.description || '',
                tags: Array.isArray(nodeData.tags) ? nodeData.tags.join(', ') : (nodeData.tags || '')
            });
        }
    }, [nodeData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));

        // Auto-mapping logic for ID change
        if (name === 'id') {
            const employee = allNodes.find((n: any) => String(n.id) === String(value));
            if (employee) {
                setFormData((prev: any) => ({
                    ...prev,
                    [name]: value, // Keep the ID typed
                    name: employee.name || prev.name,
                    title: employee.title || prev.title,
                    img: employee.img || employee.photo || employee.image || prev.img,
                    dept: employee.dept || prev.dept
                    // IMPORTANT: Do NOT update pid or stpid here. 
                    // We want to keep the current parenting structure even if the node identity changes.
                }));
            }
        }
    };

    const handleSave = () => {
        if (!formData.id) {
            alert("ID is required!");
            return;
        }

        // Clean up tags
        const tagsArray = typeof formData.tags === 'string'
            ? formData.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
            : formData.tags;

        const dataToSave = {
            ...formData,
            tags: tagsArray
        };

        onSave(nodeData.id, dataToSave);
        onClose();
    };

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this node?")) {
            if (onDelete && nodeData?.id) {
                onDelete(nodeData.id);
            }
        }
    };

    const isDepartment = formData.tags?.toString().toLowerCase().includes('group');

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
                    <div className="fixed inset-0 bg-black/25" />
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4"
                                >
                                    Edit Node Details
                                </Dialog.Title>

                                <div className="space-y-4">
                                    {/* ID Field */}
                                    {!isDepartment && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Employee ID / Node ID</label>
                                            <input
                                                type="text"
                                                name="id"
                                                value={formData.id || ''}
                                                onChange={handleChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white sm:text-sm border p-2"
                                            />
                                        </div>
                                    )}

                                    {/* Name Field */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white sm:text-sm border p-2"
                                        />
                                    </div>

                                    {/* Title Field */}
                                    {!isDepartment && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Title</label>
                                            <input
                                                type="text"
                                                name="title"
                                                value={formData.title || ''}
                                                onChange={handleChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white sm:text-sm border p-2"
                                            />
                                        </div>
                                    )}

                                    {/* Department Field */}
                                    {!isDepartment && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Department</label>
                                            <input
                                                type="text"
                                                name="dept"
                                                value={formData.dept || ''}
                                                onChange={handleChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white sm:text-sm border p-2"
                                            />
                                        </div>
                                    )}

                                    {/* Description Field */}
                                    {!isDepartment && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Description</label>
                                            <textarea
                                                name="description"
                                                value={formData.description || ''}
                                                onChange={handleChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white sm:text-sm border p-2"
                                            />
                                        </div>
                                    )}

                                    {/* Tags Field */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Tags (comma separated)</label>
                                        <input
                                            type="text"
                                            name="tags"
                                            value={formData.tags || ''}
                                            onChange={handleChange}
                                            placeholder="group, assistant, etc."
                                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white sm:text-sm border p-2"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    {onDelete && (
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:visible:ring-2 focus:visible:ring-red-500 focus:visible:ring-offset-2 mr-auto"
                                            onClick={handleDelete}
                                        >
                                            Delete
                                        </button>
                                    )}

                                    {/* Move Buttons */}
                                    {onMove && (
                                        <div className="flex gap-2 mr-auto ml-2">
                                            <button
                                                type="button"
                                                className="inline-flex justify-center rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                                onClick={() => nodeData?.id && onMove(nodeData.id, 'left')}
                                                title="Move Left"
                                            >
                                                &larr;
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex justify-center rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                                onClick={() => nodeData?.id && onMove(nodeData.id, 'right')}
                                                title="Move Right"
                                            >
                                                &rarr;
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 dark:bg-slate-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-500 focus:outline-none focus:visible:ring-2 focus:visible:ring-gray-500 focus:visible:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:visible:ring-2 focus:visible:ring-indigo-500 focus:visible:ring-offset-2"
                                        onClick={handleSave}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition >
    );
}
