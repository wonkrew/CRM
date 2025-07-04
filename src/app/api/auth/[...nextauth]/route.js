import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { db } = await connectToDatabase();
        const user = await db.collection("users").findOne({ email: credentials.email });

        if (!user) {
          throw new Error("No user found with this email.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Incorrect password.");
        }

        return { id: user._id.toString(), email: user.email, name: user.name };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // If a user object is passed, it's a new sign-in.
      if (user) {
        token.id = user.id;
      }

      // Always re-fetch memberships from the database to ensure the token is fresh.
      // This is crucial for scenarios like organization creation.
      const { db } = await connectToDatabase();
      const memberships = await db
        .collection("memberships")
        .find({
          userId: new ObjectId(token.id),
        })
        .toArray();

      token.memberships = memberships.map((m) => ({
        organizationId: m.organizationId.toString(),
        role: m.role,
      }));

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.memberships = token.memberships;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };