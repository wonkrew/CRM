import { MongoClient } from "mongodb";
import { MONGODB_URI, DB_NAME, INDEXES } from "./constants";

// Check for required environment variables
if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

// Singleton pattern for MongoDB connection (Next.js hot reload safe)
let cached = global.mongo || { conn: null, promise: null };
if (!global.mongo) {
  global.mongo = cached;
}

async function createIndexes(db) {
  try {
    // Create indexes for each collection
    for (const [collection, indexes] of Object.entries(INDEXES)) {
      const existingIndexes = await db.collection(collection).listIndexes().toArray();
      const existingIndexNames = existingIndexes.map(index => index.name);

      for (const index of indexes) {
        const indexName = Object.entries(index.key)
          .map(([key, value]) => `${key}_${value}`)
          .join('_');

        if (!existingIndexNames.includes(indexName)) {
          await db.collection(collection).createIndex(index.key, {
            unique: index.unique || false,
            background: true,
            name: indexName
          });
          console.log(`Created index ${indexName} on collection ${collection}`);
        }
      }
    }
  } catch (error) {
    console.error('Error creating indexes:', error);
    // Don't throw the error - indexes are important but not critical
  }
}

export async function connectToDatabase() {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Create new connection if none exists
  if (!cached.promise) {
    const options = {
      useUnifiedTopology: true,
      maxPoolSize: 10, // Limit concurrent connections
      serverSelectionTimeoutMS: 5000, // Timeout if server selection fails
      socketTimeoutMS: 45000, // Timeout for operations
    };

    cached.promise = MongoClient.connect(MONGODB_URI, options)
      .then(async (client) => {
        const db = client.db(DB_NAME);
        
        // Create indexes in the background
        createIndexes(db).catch(console.error);
        
        return {
          client,
          db
        };
      })
      .catch(err => {
        console.error('MongoDB connection error:', err);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null; // Reset promise on error
    throw err;
  }
}