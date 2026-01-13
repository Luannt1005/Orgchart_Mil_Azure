import HeadcountManager from "@/components/HeadcountManager";

export const metadata = {
    title: 'Open Headcount Management',
    description: 'Manage open headcount positions',
};

export default function HeadcountOpenPage() {
    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden bg-gray-50/50">
            <HeadcountManager />
        </div>
    );
}
