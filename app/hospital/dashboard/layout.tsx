import { Sidebar } from "@/components/hospital/sidebar";
import { Navbar } from "@/components/hospital/navbar";
import { MobileSidebar } from "@/components/hospital/MobileSidebar";

export default function HospitalDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-50">
        <Sidebar />
      </div>
      <main className="md:pl-72">
        <Navbar>
          <MobileSidebar />
        </Navbar>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
