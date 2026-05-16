export default function StatCard({ title, value, icon, color }) {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
    };

    return (
        <div className={`rounded-xl border-2 p-6 ${colors[color] || colors.blue}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium opacity-70">{title}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                </div>
                <span className="text-4xl">{icon}</span>
            </div>
        </div>
    );
}