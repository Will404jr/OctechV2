// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Queue from "@/lib/models/hospital";

// export async function PUT(
//   req: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     await dbConnect();
//     const data = await req.json();
//     const queue = await Queue.findByIdAndUpdate(params.id, data, {
//       new: true,
//     });
//     return NextResponse.json(queue);
//   } catch (error) {
//     return NextResponse.json(
//       { error: "Failed to update queue" },
//       { status: 500 }
//     );
//   }
// }

// export async function DELETE(
//   req: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     await dbConnect();
//     await Queue.findByIdAndDelete(params.id);
//     // Delete all child queues
//     await Queue.deleteMany({ parentId: params.id });
//     return NextResponse.json({ success: true });
//   } catch (error) {
//     return NextResponse.json(
//       { error: "Failed to delete queue" },
//       { status: 500 }
//     );
//   }
// }
