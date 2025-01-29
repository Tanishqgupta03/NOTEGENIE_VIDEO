import { dbConnect } from '@/lib/dbConnect';
import { uploadToCloudinary } from '@/lib/cloudinary';
import Video from '@/models/Video.js';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Disable default body parsing (multer will handle it)
export const config = {
  api: {
    bodyParser: false,
  },
};

// Middleware to handle CORS
function setCORSHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins (Change to 'http://localhost:3000' for stricter control)
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Handle OPTIONS request (CORS preflight)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 }); // 204 No Content
  return setCORSHeaders(response);
}

// Named POST function
export async function POST(request) {
  try {
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get('video');
    const userId = formData.get('userId'); // Get userId from FormData

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const MAX_SIZE = 250 * 1024 * 1024; // 250MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 250MB)" },
        { status: 413 }
      );
    }
    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const cloudinaryResponse = await uploadToCloudinary(fileBuffer, {
      resource_type: 'video',
      folder: 'note-genie/videos',
    });

    console.log("cloudinaryResponse : ",cloudinaryResponse);
    if (cloudinaryResponse.duration > 300) {
      // Delete the uploaded video
      await cloudinary.v2.uploader.destroy(cloudinaryResponse.public_id, {
        resource_type: 'video'
      });
      return NextResponse.json(
        { error: "Video exceeds 5 minute duration limit" },
        { status: 400 }
      );
    }

    const video = await Video.create({
      userId: new mongoose.Types.ObjectId(userId), // Ensure ObjectId type
      filename: file.name,
      url: cloudinaryResponse.secure_url,
    });

    let response = NextResponse.json({ video }, { status: 201 });
    return setCORSHeaders(response); // Apply CORS headers before returning
  } catch (error) {
    console.error('Error uploading video:', error);
    let response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return setCORSHeaders(response); // Apply CORS headers
  }
}
