"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Hospital, Building2 } from "lucide-react";
import { QueueSpinner } from "@/components/queue-spinner";

interface LoginFormData {
  email: string;
  password: string;
}

interface RoomSelectionData {
  departmentId: string;
  roomNumber: string;
}

interface Department {
  _id: string;
  title: string;
  icon: string;
}

interface Staff {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ActiveRoom {
  _id: string;
  roomNumber: string;
  available: boolean;
  createdAt: string;
}

interface ActiveRoomResponse {
  hasActiveRoom: boolean;
  room?: ActiveRoom;
  department?: {
    _id: string;
    title: string;
    icon: string;
  };
}

const defaultValues: LoginFormData = {
  email: "",
  password: "",
};

export default function ServingLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [existingRooms, setExistingRooms] = useState<string[]>([]);
  const [staffInfo, setStaffInfo] = useState<Staff | null>(null);
  const [hasActiveRoom, setHasActiveRoom] = useState(false);
  const [activeRoomInfo, setActiveRoomInfo] =
    useState<ActiveRoomResponse | null>(null);

  const { control, handleSubmit } = useForm<LoginFormData>({
    defaultValues,
  });
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/session");
        const session = await response.json();
        if (session.isLoggedIn) {
          setIsLoggedIn(true);
          setStaffInfo({
            _id: session.userId,
            firstName: session.firstName || "",
            lastName: session.lastName || "",
            email: session.email || "",
          });

          // Check if user already has an active room for today
          await checkActiveRoom(session.userId);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [router]);

  const checkActiveRoom = async (userId: string) => {
    try {
      console.log(`Checking active room for user ${userId}`);
      const roomResponse = await fetch(
        `/api/hospital/staff/${userId}/active-room`
      );

      if (!roomResponse.ok) {
        throw new Error("Failed to check active room");
      }

      const roomData: ActiveRoomResponse = await roomResponse.json();
      console.log("Active room response:", roomData);

      setActiveRoomInfo(roomData);
      setHasActiveRoom(roomData.hasActiveRoom);

      if (roomData.hasActiveRoom && roomData.department) {
        console.log(
          `User has active room in department: ${roomData.department.title}`
        );

        // Update session with department info
        await fetch("/api/session/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            department: roomData.department.title,
            roomId: roomData.room?._id,
          }),
        });

        // Redirect based on department
        if (roomData.department.title === "Reception") {
          router.push("/hospital/receptionist");
        } else {
          router.push("/hospital/serving");
        }
      }
    } catch (error) {
      console.error("Error checking active room:", error);
      toast({
        title: "Error",
        description: "Failed to check if you have an active room",
        variant: "destructive",
      });
    }
  };

  // Fetch departments when logged in
  useEffect(() => {
    if (isLoggedIn) {
      const fetchDepartments = async () => {
        try {
          const response = await fetch("/api/hospital/department");
          if (!response.ok) throw new Error("Failed to fetch departments");
          const data = await response.json();
          setDepartments(data);
        } catch (error) {
          console.error("Error fetching departments:", error);
          toast({
            title: "Error",
            description: "Failed to load departments",
            variant: "destructive",
          });
        }
      };

      fetchDepartments();
    }
  }, [isLoggedIn, toast]);

  // Fetch existing rooms when department is selected
  useEffect(() => {
    if (selectedDepartment) {
      const fetchExistingRooms = async () => {
        try {
          const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
          const response = await fetch(
            `/api/hospital/department/${selectedDepartment}/rooms?date=${today}`
          );
          if (!response.ok) throw new Error("Failed to fetch rooms");
          const data = await response.json();
          setExistingRooms(data.rooms.map((room: any) => room.roomNumber));
        } catch (error) {
          console.error("Error fetching rooms:", error);
          toast({
            title: "Error",
            description: "Failed to load existing rooms",
            variant: "destructive",
          });
        }
      };

      fetchExistingRooms();
    }
  }, [selectedDepartment, toast]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/hospital/serving-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        setIsLoggedIn(true);

        // Log successful login
        await fetch("/api/hospital/log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            staffId: result.userId,
            action: "Login",
            details: "Login successful",
          }),
        });

        setStaffInfo({
          _id: result.userId,
          firstName: result.firstName || "",
          lastName: result.lastName || "",
          email: data.email,
        });

        // Check if user already has an active room for today
        await checkActiveRoom(result.userId);
      } else {
        const errorData = await response.json();
        toast({
          title: "Login Failed",
          description: errorData.error || "An error occurred during login.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoomSelection = async () => {
    if (!selectedDepartment || !roomNumber || !staffInfo) {
      toast({
        title: "Validation Error",
        description: "Please select a department and enter a room number",
        variant: "destructive",
      });
      return;
    }

    // Check if room number already exists
    if (existingRooms.includes(roomNumber)) {
      toast({
        title: "Room Already Exists",
        description:
          "This room number is already in use today. Please choose another.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/hospital/room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: staffInfo._id,
          department: selectedDepartment,
          roomNumber,
          available: false,
          date: new Date().toISOString().split("T")[0], // Today's date
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create room");
      }

      const roomData = await response.json();
      console.log("Room created:", roomData);

      // Get department title for the session
      const deptResponse = await fetch(
        `/api/hospital/department/${selectedDepartment}`
      );
      const deptData = await deptResponse.json();

      // Create log entry for room selection
      await fetch("/api/hospital/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: staffInfo._id,
          action: "Room selection",
          details: `Room ${roomNumber} assigned in ${deptData.title} department`,
        }),
      });

      toast({
        title: "Success",
        description: `Room ${roomNumber} assigned successfully for today`,
      });

      // Get department title for the session
      const deptResponse2 = await fetch(
        `/api/hospital/department/${selectedDepartment}`
      );
      const deptData2 = await deptResponse2.json();

      // Update session with department and room info
      await fetch("/api/session/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: deptData2.title,
          roomId: roomData.roomId,
        }),
      });

      // Redirect based on department
      if (deptData2.title === "Reception") {
        router.push("/hospital/receptionist");
      } else {
        router.push("/hospital/serving");
      }
    } catch (error: any) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create room",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/bg.jpg?height=1080&width=1920')",
      }}
    >
      {!isLoggedIn ? (
        <Card className="w-[350px] bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Hospital className="h-12 w-12 text-[#0e4480]" />
            </div>
            <CardTitle className="text-center">Staff Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the serving system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staff-email">Email</Label>
                <Controller
                  name="email"
                  control={control}
                  rules={{ required: "Email is required" }}
                  render={({ field }) => (
                    <Input
                      id="staff-email"
                      type="email"
                      placeholder="m@example.com"
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password">Password</Label>
                <Controller
                  name="password"
                  control={control}
                  rules={{ required: "Password is required" }}
                  render={({ field }) => (
                    <Input id="staff-password" type="password" {...field} />
                  )}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#0e4480]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Don't have an account? Contact your administrator.
            </p>
          </CardFooter>
        </Card>
      ) : (
        <Card className="w-[400px] bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Building2 className="h-12 w-12 text-[#0e4480]" />
            </div>
            <CardTitle className="text-center">Room Selection</CardTitle>
            <CardDescription className="text-center">
              Select your department and room for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        <span className="flex items-center">
                          <span className="mr-2">{dept.icon}</span> {dept.title}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomNumber">Room Number</Label>
                <Input
                  id="roomNumber"
                  placeholder="Enter room number"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
                {existingRooms.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Existing rooms today: {existingRooms.join(", ")}
                  </p>
                )}
              </div>
              <Button
                className="w-full bg-[#0e4480]"
                onClick={handleRoomSelection}
                disabled={isLoading || !selectedDepartment || !roomNumber}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning Room...
                  </>
                ) : (
                  "Assign Room & Continue"
                )}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Room assignments are valid for today only
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
