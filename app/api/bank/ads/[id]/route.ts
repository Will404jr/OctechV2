import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ad } from "@/lib/models/bank";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const ad = await Ad.findById(params.id);
    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // Delete the image file
    const imagePath = path.join(process.cwd(), "public", ad.image);
    await unlink(imagePath);

    // Delete the ad from the database
    await Ad.findByIdAndDelete(params.id);

    return NextResponse.json({ message: "Ad deleted successfully" });
  } catch (error) {
    console.error("Error deleting ad:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
