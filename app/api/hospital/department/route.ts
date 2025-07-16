import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import { Department } from "@/lib/models/hospital"
import departmentsData from "@/data/departments"

export async function GET() {
  try {
    await dbConnect()

    const departments = await Department.find({})
      .populate({
        path: "rooms.staff",
        select: "firstName lastName username",
      })
      .lean()

    // Ensure all rooms have the available field explicitly set
    const departmentsWithAvailability = departments.map((dept: any) => ({
      ...dept,
      rooms: dept.rooms.map((room: any) => ({
        ...room,
        available: room.available === true,
      })),
    }))

    return NextResponse.json(departmentsWithAvailability)
  } catch (error) {
    console.error("Error fetching departments:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect()
    const body = await req.json()
    const { departmentTitle } = body

    if (!departmentTitle) {
      return NextResponse.json({ error: "Department title is required" }, { status: 400 })
    }

    // Check if department already exists
    const existingDepartment = await Department.findOne({
      title: departmentTitle,
    })
    if (existingDepartment) {
      return NextResponse.json({ error: "Department already exists" }, { status: 409 })
    }

    // Find the department data from the master list
    const departmentData = departmentsData.find((dept) => dept.title === departmentTitle)
    if (!departmentData) {
      return NextResponse.json({ error: "Invalid department title" }, { status: 400 })
    }

    // Create new department
    const newDepartment = new Department({
      title: departmentData.title,
      icon: departmentData.icon,
      rooms: [], // Start with no rooms
    })

    await newDepartment.save()

    // Populate the staff information before returning
    const populatedDepartment = await Department.findById(newDepartment._id)
      .populate({
        path: "rooms.staff",
        select: "firstName lastName username",
      })
      .lean()

    return NextResponse.json({ success: true, data: populatedDepartment })
  } catch (error) {
    console.error("Error creating department:", error)
    return NextResponse.json({ success: false, error: "Failed to create department" }, { status: 500 })
  }
}
