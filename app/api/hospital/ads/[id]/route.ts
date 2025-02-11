import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { HospitalAd } from "@/lib/models/hospital";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  try {
    await dbConnect();
    const ad = await HospitalAd.findById(id);
    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // Extract filename from the image path
    const filename = path.basename(ad.image);

    // Delete the image file
    const imagePath = path.join(process.cwd(), "uploads", filename);
    await unlink(imagePath);

    // Delete the ad from the database
    await HospitalAd.findByIdAndDelete(id);

    return NextResponse.json({ message: "Ad deleted successfully" });
  } catch (error) {
    console.error("Error deleting ad:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
