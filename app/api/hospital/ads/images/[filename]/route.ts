import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  const uploadsDir = join(process.cwd(), "uploads");
  const filePath = join(uploadsDir, filename);

  try {
    const fileBuffer = await readFile(filePath);
    const response = new NextResponse(fileBuffer);

    // Determine content type based on file extension
    const fileExtension = filename.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream"; // default
    if (fileExtension === "jpg" || fileExtension === "jpeg")
      contentType = "image/jpeg";
    else if (fileExtension === "png") contentType = "image/png";
    else if (fileExtension === "gif") contentType = "image/gif";

    response.headers.set("Content-Type", contentType);
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
