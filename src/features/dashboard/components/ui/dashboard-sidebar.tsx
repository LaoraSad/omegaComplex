export default function DashboardSidebar() {
  return (
    <nav className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Navegación</h2>
      <ul className="space-y-4">
        <li>
          <a href="#reservas" className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1m-3 78V9a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h2m-3 78l9-18 9 18l-9-18-9 18z"></path>
            </svg>
            Reservas
          </a>
        </li>
        <li>
          <a href="#clientes" className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            Clientes
          </a>
        </li>
        <li>
          <a href="#reportes" className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2mh4a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m-3-3h9m-9 3v3m0 0v3m0-3h3m-3 0h-3"></path>
            </svg>
            Reportes
          </a>
        </li>
      </ul>
    </nav>
  )
}