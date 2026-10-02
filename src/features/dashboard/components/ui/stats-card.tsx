export default function StatsCard({
  title,
  value,
  subtitle,
  color = "blue",
}: {
  title: string
  value: string | number
  subtitle: string
  color?: string
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    orange: "bg-orange-100 text-orange-800",
  }

  return (
    <div className={`p-6 rounded-lg ${colors[color]}`}>
      <p className="text-sm text-gray-500 uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
    </div>
  )
}