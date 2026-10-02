import DashboardSidebar from "@/components/ui/dashboard-sidebar";
import StatsCard from "@/components/ui/stats-card";
import RecentActivity from "@/components/ui/recent-activity";

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Panel de Control</h1>

        <div className="flex">
          <DashboardSidebar />

          <div className="w-full md:w-0 md:w-[260px] lg:static flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Reservas"
                value="1,247"
                subtitle="Este mes"
                color="blue"
              />
              <StatsCard
                title="Ingresos"
                value="$12,540"
                subtitle="Este mes"
                color="green"
              />
              <StatsCard
                title="Usuarios Activos"
                value="243"
                subtitle="Este mes"
                color="orange"
              />
              <StatsCard
                title="Capacidad Ocupada"
                value="78%"
                subtitle="Este mes"
                color="red"
              />
            </div>

            <div className="mt-8">
              <RecentActivity />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}