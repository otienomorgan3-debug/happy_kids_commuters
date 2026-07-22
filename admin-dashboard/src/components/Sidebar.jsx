import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/schools', label: 'Schools' },
    { to: '/students', label: 'Students' },
    { to: '/parents', label: 'Parents' },
    { to: '/drivers', label: 'Drivers' },
    { to: '/buses', label: 'Buses' },
    { to: '/routes', label: 'Routes' },
    { to: '/map', label: 'Live Map' },
    { to: '/payments', label: 'Payments' },
    { to: '/financial-reports', label: 'Financial Reports' },
    { to: '/incidents', label: 'Incidents' },
    { to: '/analytics', label: 'Analytics' },
];

export default function Sidebar() {
    const { logout, user } = useAuth();

    return (
        <div className="w-64 min-h-screen bg-blue-900 text-white flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-blue-700">
                <h1 className="text-xl font-bold">HKCS Admin</h1>
                <p className="text-blue-300 text-sm mt-1">{user?.name}</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-blue-200 hover:bg-blue-800'
                            }`
                        }
                    >
                        {link.label}
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-blue-700">
                <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-sm text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg transition-colors"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
