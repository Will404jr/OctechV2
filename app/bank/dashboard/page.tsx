"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckSquare, Clock, ArrowRightCircle } from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  type ChartOptions,
} from "chart.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const chartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
    tooltip: {
      mode: "index" as const,
      intersect: false,
      callbacks: {
        label: (context) => `Tickets: ${context.parsed.y}`,
      },
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: "Hour of Day",
      },
      grid: {
        display: false,
      },
    },
    y: {
      display: false, // Hide the y-axis
      beginAtZero: true,
      grid: {
        display: false,
      },
    },
  },
};

interface DashboardData {
  totalTickets: number;
  ticketsServed: number;
  waitingTickets: number;
  inProgressTickets: number;
  ticketsPerHour: number[];
}

interface Branch {
  _id: string;
  name: string;
}

export default function BankDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch("/api/bank/branches");
        if (!response.ok) {
          throw new Error("Failed to fetch branches");
        }
        const data = await response.json();
        setBranches(data);
        if (data.length > 0) {
          setSelectedBranch(data[0]._id);
        }
      } catch (err) {
        setError("Error fetching branches");
        console.error(err);
      }
    };

    fetchBranches();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!selectedBranch) return;

      try {
        const response = await fetch(
          `/api/bank/dashboard?branchId=${selectedBranch}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const data = await response.json();
        setDashboardData(data);
        console.log("Fetched dashboard data:", data); // Add this line for debugging
      } catch (err) {
        setError("Error fetching dashboard data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchDashboardData();

    // Set up polling every 5 seconds
    const intervalId = setInterval(fetchDashboardData, 5000);

    // Clean up function to clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [selectedBranch]);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  const chartData = {
    labels: Array.from({ length: 24 }, (_, i) => {
      const date = new Date();
      date.setHours(i, 0, 0, 0);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
        timeZone: "Africa/Kampala",
      });
    }),
    datasets: [
      {
        fill: true,
        label: "Tickets",
        data: dashboardData.ticketsPerHour,
        borderColor: "#be0028",
        backgroundColor: "#be0028",
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-row justify-between ">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Displaying stats for {currentDate}
          </p>
        </div>

        <div className="flex justify-end">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch._id} value={branch._id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.totalTickets}
            </div>
            <p className="text-xs text-muted-foreground">Today's total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tickets Served
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.ticketsServed}
            </div>
            <p className="text-xs text-muted-foreground">Completed tickets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Waiting Tickets
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.waitingTickets}
            </div>
            <p className="text-xs text-muted-foreground">Not Served</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <ArrowRightCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.inProgressTickets}
            </div>
            <p className="text-xs text-muted-foreground">Serving</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets Per Hour</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <Line options={chartOptions} data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
