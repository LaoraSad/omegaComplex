import { getDashboardOverview } from "@/features/admin/admin.repository";

async function testDashboard() {
  const data = await getDashboardOverview();
  console.log("✅ getDashboardOverview succeeded! Total reservations:", data.totalReservations);
}

testDashboard().catch(console.error).finally(() => process.exit(0));

