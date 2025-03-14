import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Department } from "@/lib/models/hospital";
import { Staff } from "@/lib/models/hospital";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title");

    if (title) {
      const department = await Department.findOne({ title })
        .populate({
          path: "rooms.staff",
          select: "firstName lastName username",
        })
        .lean();

      if (!department) {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(department);
    } else {
      const departments = await Department.find()
        .populate({
          path: "rooms.staff",
          select: "firstName lastName username",
        })
        .lean();
      return NextResponse.json(departments);
    }
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { departmentTitle, roomNumber, staffId } = body;

    // Validate input
    if (!departmentTitle || !roomNumber || !staffId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Check if department already exists
    const existingDepartment = await Department.findOne({
      title: departmentTitle,
    });
    if (existingDepartment) {
      return NextResponse.json(
        { error: "Department already exists" },
        { status: 409 }
      );
    }

    // Get icon from the departments array
    const { default: departmentsData } = await import("@/data/departments");
    const deptData = departmentsData.find((d) => d.title === departmentTitle);

    if (!deptData) {
      return NextResponse.json(
        { error: "Department not found in reference data" },
        { status: 404 }
      );
    }

    // Create new department with initial room
    const newDepartment = await Department.create({
      title: departmentTitle,
      icon: deptData.icon,
      rooms: [
        {
          roomNumber,
          staff: staffId,
        },
      ],
    });

    // Populate staff details for response
    const populatedDepartment = await Department.findById(newDepartment._id)
      .populate({
        path: "rooms.staff",
        select: "firstName lastName username",
      })
      .lean();

    return NextResponse.json(
      { success: true, data: populatedDepartment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create department" },
      { status: 500 }
    );
  }
}
