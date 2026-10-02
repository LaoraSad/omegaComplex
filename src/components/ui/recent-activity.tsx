export default function RecentActivity() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Actividad Reciente</h2>
      <ul className="space-y-2">
        <li className="flex items-center gap-3 p-3 rounded-lg bg-white">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <div>
            <p className="text-sm text-gray-600">Nueva reserva confirmada</p>
            <p className="text-xs text-gray-400">Hoy 10:30</p>
          </div>
        </li>
        <li className="flex items-center gap-3 p-3 rounded-lg bg-white">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <div>
            <p className="text-sm text-gray-600">Pago procesado</p>
            <p className="text-xs text-gray-400">Ayer 14:15</p>
          </div>
        </li>
        <li className="flex items-center gap-3 p-3 rounded-lg bg-white">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div>
            <p className="text-sm text-gray-600">Nuevo usuario registrado</p>
            <p className="text-xs text-gray-400">Hace 2 días</p>
          </div>
        </li>
      </ul>
    </div>
  )
}