import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';

interface EditNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (nodeId: string, data: any) => void;
    onDelete?: (nodeId: string) => void;
    nodeData: any | null;
    allNodes: any[]; // For auto-mapping
}

export default function EditNodeModal({
    isOpen,
    onClose,
    onSave,
    onDelete,

    nodeData,
    allNodes
}: EditNodeModalProps) {
    const [formData, setFormData] = useState<any>({});
    const [tableData, setTableData] = useState<{ headers: string[], rows: string[][] }>({
        headers: [],
        rows: []
    });

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

            if (nodeData.tableData) {
                setTableData(nodeData.tableData);
            } else {
                setTableData({ headers: ["Item", "Description"], rows: [["A", "Desc A"]] });
            }
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

    // Table Handlers
    const handleTableChange = (type: 'header' | 'cell', rowIndex: number, colIndex: number, value: string) => {
        setTableData(prev => {
            const newData = { ...prev, rows: [...prev.rows] }; // Shallow copy rows
            if (type === 'header') {
                const newHeaders = [...prev.headers];
                newHeaders[colIndex] = value;
                return { ...prev, headers: newHeaders };
            } else {
                newData.rows[rowIndex] = [...prev.rows[rowIndex]]; // Copy specific row
                newData.rows[rowIndex][colIndex] = value;
                return newData;
            }
        });
    };

    const addColumn = () => {
        setTableData(prev => ({
            headers: [...prev.headers, "New Header"],
            rows: prev.rows.map(row => [...row, ""])
        }));
    };

    const removeColumn = (index: number) => {
        setTableData(prev => ({
            headers: prev.headers.filter((_, i) => i !== index),
            rows: prev.rows.map(row => row.filter((_, i) => i !== index))
        }));
    };

    const addRow = () => {
        setTableData(prev => ({
            ...prev,
            rows: [...prev.rows, new Array(prev.headers.length).fill("")]
        }));
    };

    const removeRow = (index: number) => {
        setTableData(prev => ({
            ...prev,
            rows: prev.rows.filter((_, i) => i !== index)
        }));
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
            tags: tagsArray,
            tableData: isDescriptionTable ? tableData : undefined
        };

        // Generate table_html if it's a description table
        if (isDescriptionTable && tableData) {
            let tableHtml = `<table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; background: white;">`;
            // Head
            tableHtml += `<thead><tr>`;
            tableData.headers.forEach((h: string) => {
                tableHtml += `<th style="border: 1px solid #ccc; padding: 2px; background: #f0f0f0; text-align: center; font-weight: bold;">${h}</th>`;
            });
            tableHtml += `</tr></thead>`;
            // Body
            tableHtml += `<tbody>`;
            tableData.rows.forEach((row: string[]) => {
                tableHtml += `<tr>`;
                row.forEach((cell: string) => {
                    tableHtml += `<td style="border: 1px solid #ccc; padding: 2px; text-align: center;">${cell}</td>`;
                });
                tableHtml += `</tr>`;
            });
            tableHtml += `</tbody></table>`;

            // @ts-ignore
            dataToSave.table_html = tableHtml;
        }

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
    const isDescriptionTable = formData.tags?.toString().toLowerCase().includes('description_table');

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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[var(--color-bg-card)] p-6 text-left align-middle shadow-xl transition-all border border-[var(--color-border)]">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-[var(--color-text-title)] mb-4"
                                >
                                    {isDescriptionTable ? "Edit Description Table" : "Edit Node Details"}
                                </Dialog.Title>

                                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">

                                    {!isDescriptionTable && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* ID Field */}
                                            {!isDepartment && (
                                                <div>
                                                    <label className="block text-sm font-medium text-[var(--color-text-body)]">Employee ID / Node ID</label>
                                                    <input
                                                        type="text"
                                                        name="id"
                                                        value={formData.id || ''}
                                                        onChange={handleChange}
                                                        className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] shadow-sm focus:border-[var(--color-primary-mwk)] focus:ring-[var(--color-primary-mwk-light)] sm:text-sm p-2"
                                                    />
                                                </div>
                                            )}

                                            {/* Name Field */}
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--color-text-body)]">Name</label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name || ''}
                                                    onChange={handleChange}
                                                    className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] shadow-sm focus:border-[var(--color-primary-mwk)] focus:ring-[var(--color-primary-mwk-light)] sm:text-sm p-2"
                                                />
                                            </div>

                                            {/* Title Field */}
                                            {!isDepartment && (
                                                <div>
                                                    <label className="block text-sm font-medium text-[var(--color-text-body)]">Title</label>
                                                    <input
                                                        type="text"
                                                        name="title"
                                                        value={formData.title || ''}
                                                        onChange={handleChange}
                                                        className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] shadow-sm focus:border-[var(--color-primary-mwk)] focus:ring-[var(--color-primary-mwk-light)] sm:text-sm p-2"
                                                    />
                                                </div>
                                            )}

                                            {/* Department Field */}
                                            {!isDepartment && (
                                                <div>
                                                    <label className="block text-sm font-medium text-[var(--color-text-body)]">Department</label>
                                                    <input
                                                        type="text"
                                                        name="dept"
                                                        value={formData.dept || ''}
                                                        onChange={handleChange}
                                                        className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] shadow-sm focus:border-[var(--color-primary-mwk)] focus:ring-[var(--color-primary-mwk-light)] sm:text-sm p-2"
                                                    />
                                                </div>
                                            )}

                                            {/* Tags Field */}
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--color-text-body)]">Tags (comma separated)</label>
                                                <input
                                                    type="text"
                                                    name="tags"
                                                    value={formData.tags || ''}
                                                    onChange={handleChange}
                                                    placeholder="group, assistant, etc."
                                                    className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] shadow-sm focus:border-[var(--color-primary-mwk)] focus:ring-[var(--color-primary-mwk-light)] sm:text-sm p-2"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Description Field - Show for both but maybe different label */}
                                    {!isDepartment && !isDescriptionTable && (
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--color-text-body)]">Description</label>
                                            <textarea
                                                name="description"
                                                value={formData.description || ''}
                                                onChange={handleChange}
                                                className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] shadow-sm focus:border-[var(--color-primary-mwk)] focus:ring-[var(--color-primary-mwk-light)] sm:text-sm p-2"
                                            />
                                        </div>
                                    )}

                                    {/* --- Table Editor Section (ONLY for Description Tables) --- */}
                                    {isDescriptionTable && (
                                        <div className="border-t border-[var(--color-border)] pt-4 mt-4">
                                            <div className="bg-[var(--color-bg-page)] p-3 rounded-md border border-[var(--color-border)]">
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-[var(--color-border)]">
                                                        <thead>
                                                            <tr>
                                                                {tableData.headers.map((header, colIndex) => (
                                                                    <th key={colIndex} className="p-1 relative group">
                                                                        <input
                                                                            type="text"
                                                                            value={header}
                                                                            onChange={(e) => handleTableChange('header', 0, colIndex, e.target.value)}
                                                                            className="w-full text-xs font-bold text-center bg-transparent border-none focus:ring-0 p-1"
                                                                            placeholder="Header"
                                                                        />
                                                                        <button
                                                                            onClick={() => removeColumn(colIndex)}
                                                                            className="absolute -top-2 -right-1 text-red-500 opacity-0 group-hover:opacity-100 text-xs bg-white rounded-full w-4 h-4 flex items-center justify-center border border-red-200"
                                                                            title="Remove Column"
                                                                        >×</button>
                                                                    </th>
                                                                ))}
                                                                <th className="p-1 w-8">
                                                                    <button onClick={addColumn} className="text-blue-500 hover:text-blue-700" title="Add Column">+</button>
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[var(--color-border)]">
                                                            {tableData.rows.map((row, rowIndex) => (
                                                                <tr key={rowIndex} className="group">
                                                                    {row.map((cell, colIndex) => (
                                                                        <td key={colIndex} className="p-1">
                                                                            <input
                                                                                type="text"
                                                                                value={cell}
                                                                                onChange={(e) => handleTableChange('cell', rowIndex, colIndex, e.target.value)}
                                                                                className="w-full text-xs border border-[var(--color-border)] rounded px-1 py-0.5"
                                                                            />
                                                                        </td>
                                                                    ))}
                                                                    <td className="p-1 text-center">
                                                                        <button
                                                                            onClick={() => removeRow(rowIndex)}
                                                                            className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            title="Remove Row"
                                                                        >×</button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="mt-2 text-center">
                                                    <button onClick={addRow} className="text-xs text-blue-500 hover:underline">+ Add Row</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                                    {onDelete && (
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:visible:ring-2 focus:visible:ring-red-500 focus:visible:ring-offset-2 mr-auto"
                                            onClick={handleDelete}
                                        >
                                            Delete
                                        </button>
                                    )}


                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-[var(--color-bg-page)] px-4 py-2 text-sm font-medium text-[var(--color-text-title)] hover:bg-[var(--color-border)] focus:outline-none focus:visible:ring-2 focus:visible:ring-gray-500 focus:visible:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-[var(--color-primary-mwk)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-mwk-dark)] focus:outline-none focus:visible:ring-2 focus:visible:ring-[var(--color-primary-mwk)] focus:visible:ring-offset-2"
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
