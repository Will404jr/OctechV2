import { Sidebar } from "@/components/bank/sidebar";
import { Navbar } from "@/components/bank/navbar";
import { MobileSidebar } from "@/components/bank/MobileSidebar";

export default function BankDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 bg-gray-50">
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
