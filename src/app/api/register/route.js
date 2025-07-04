import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

// Ensure this route is executed in the Node.js runtime (not Edge) and never statically optimized
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), { status: 400 });
    }
    // Very basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Email duplicate check
    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return new Response(JSON.stringify({ error: "Email already registered" }), { status: 409 });
    }
    // Password hash
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection("users").insertOne({
      email,
      password: hashedPassword,
      // role: 'client', // Role will be assigned based on organization membership
      createdAt: new Date(),
    });
    return new Response(JSON.stringify({ success: true, message: "User registered successfully!" }), { status: 201 });
  } catch (err) {
    console.error("/api/register error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
} 