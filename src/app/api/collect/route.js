import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from 'mongodb';

function getCorsHeaders(origin) {
  // Use a whitelist of allowed origins for production, or allow localhost for development
  const allowedOrigins = [
    // Add your production frontend domains here
  ];
  const isAllowed = allowedOrigins.includes(origin) || (process.env.NODE_ENV === 'development' && origin && origin.startsWith('http://localhost:'));

  // For testing with local files (http://127.0.0.1:5500), we can be more lenient in dev
  const isFileTest = process.env.NODE_ENV === 'development' && origin && origin.startsWith('http://127.0.0.1');

  if (isAllowed || isFileTest) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    };
  }

  // Default restrictive headers
  return {
    "Access-Control-Allow-Origin": "null", 
  };
}

// Handle browser's preflight requests
export async function OPTIONS(req) {
  const origin = req.headers.get('origin') || '';
  const headers = getCorsHeaders(origin);
  return new Response(null, {
    status: 204, // No Content
    headers: headers,
  });
}

export async function POST(req) {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);
  
  try {
    const body = await req.json();
    console.log("/api/collect: Request body parsed:", JSON.stringify(body, null, 2));
    
    const { websiteId, formId, formName, formData, pageURL, submittedAt } = body;
    if (!websiteId || !formData || !pageURL || !submittedAt) {
      console.error("/api/collect: Validation failed - Missing required fields.");
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }

    const { db } = await connectToDatabase();
    console.log("/api/collect: Database connection successful.");
    
    const website = await db.collection("websites").findOne({ _id: new ObjectId(websiteId) });
    if (!website) {
      console.error(`/api/collect: Invalid websiteId - ID "${websiteId}" not found in database.`);
      return new Response(JSON.stringify({ error: "Invalid website ID" }), { status: 403, headers: corsHeaders });
    }
    console.log(`/api/collect: Website validation successful for ID: ${websiteId}`);

    const result = await db.collection("submissions").insertOne({
      websiteId: new ObjectId(websiteId),
      formId,
      formName,
      formData,
      pageURL,
      submittedAt: new Date(submittedAt),
    });

    console.log(`/api/collect: Successfully inserted submission with ID: ${result.insertedId}`);
    return new Response(JSON.stringify({ success: true, id: result.insertedId }), { status: 200, headers: corsHeaders });
  } catch (err) {
    if (err.name === 'BSONError') {
      console.error(`/api/collect: BSONError - Invalid website ID format for ID: "${body?.websiteId}".`);
      return new Response(JSON.stringify({ error: 'Invalid website ID format' }), { status: 400, headers: corsHeaders });
    }
    console.error("/api/collect: An unexpected server error occurred:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: corsHeaders });
  }
} 