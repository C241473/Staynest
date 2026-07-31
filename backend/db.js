import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { readDatabase, writeDatabase } from "./database.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGO_DB_NAME || "staynest";
let cachedClient = null;
let cachedDb = null;

const matchFilter = (item, filter) => {
  if (!item || !filter) return false;
  for (const [key, val] of Object.entries(filter)) {
    if (key === "_id" || key === "id") {
      if (String(item.id || item._id) !== String(val)) return false;
    } else if (item[key] !== val) {
      return false;
    }
  }
  return true;
};

const sortList = (list, sortSpec) => {
  const entries = Object.entries(sortSpec);
  if (!entries.length) return [...list];
  return [...list].sort((a, b) => {
    for (const [key, dir] of entries) {
      const valA = a[key] ?? "";
      const valB = b[key] ?? "";
      if (valA < valB) return dir > 0 ? -1 : 1;
      if (valA > valB) return dir > 0 ? 1 : -1;
    }
    return 0;
  });
};

class JsonCollectionAdapter {
  constructor(name) {
    this.name = name;
  }
  async createIndex() {
    return true;
  }
  async find(filter = {}) {
    const data = await readDatabase();
    let list = data[this.name] || [];
    if (Object.keys(filter).length > 0) {
      list = list.filter((item) => matchFilter(item, filter));
    }
    return {
      project: (projSpec = {}) => ({
        toArray: async () =>
          list.map((item) => {
            const copy = { ...item };
            if (projSpec.passwordHash === 0) delete copy.passwordHash;
            return copy;
          }),
      }),
      sort: (sortSpec = {}) => ({
        toArray: async () => sortList(list, sortSpec),
      }),
      toArray: async () => list,
    };
  }
  async findOne(filter = {}) {
    const data = await readDatabase();
    const list = data[this.name] || [];
    return list.find((item) => matchFilter(item, filter)) || null;
  }
  async insertOne(doc) {
    const data = await readDatabase();
    if (!data[this.name]) data[this.name] = [];
    data[this.name].push(doc);
    await writeDatabase(data);
    return { insertedId: doc.id || doc._id };
  }
  async insertMany(docs) {
    const data = await readDatabase();
    if (!data[this.name]) data[this.name] = [];
    data[this.name].push(...docs);
    await writeDatabase(data);
    return { insertedCount: docs.length };
  }
  async updateOne(filter, update, options = {}) {
    const data = await readDatabase();
    if (!data[this.name]) data[this.name] = [];
    const idx = data[this.name].findIndex((item) => matchFilter(item, filter));
    if (idx !== -1) {
      if (update.$set) {
        data[this.name][idx] = { ...data[this.name][idx], ...update.$set };
      }
      await writeDatabase(data);
      return { matchedCount: 1, modifiedCount: 1 };
    } else if (options.upsert && update.$set) {
      data[this.name].push(update.$set);
      await writeDatabase(data);
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }
  async deleteOne(filter) {
    const data = await readDatabase();
    if (!data[this.name]) data[this.name] = [];
    const idx = data[this.name].findIndex((item) => matchFilter(item, filter));
    if (idx !== -1) {
      data[this.name].splice(idx, 1);
      await writeDatabase(data);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }
  async countDocuments(filter = {}) {
    const data = await readDatabase();
    const list = data[this.name] || [];
    if (Object.keys(filter).length === 0) return list.length;
    return list.filter((item) => matchFilter(item, filter)).length;
  }
}

class JsonDbAdapter {
  collection(name) {
    return new JsonCollectionAdapter(name);
  }
}

export const connectDb = async () => {
  if (cachedDb) return { client: cachedClient, db: cachedDb };

  try {
    const client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
    });

    await client.connect();
    const db = client.db(DB_NAME);
    cachedClient = client;
    cachedDb = db;

    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ firebaseUid: 1 }, { unique: true, sparse: true });
    await db.collection("bookings").createIndex({ id: 1 }, { unique: true });
    await db.collection("hostels").createIndex({ id: 1 }, { unique: true });

    console.log("Connected to MongoDB successfully.");
    return { client, db };
  } catch (error) {
    console.warn(
      "MongoDB connection failed or unavailable. Falling back to local JSON database storage.",
      error?.message || error
    );
    cachedClient = null;
    cachedDb = new JsonDbAdapter();
    return { client: null, db: cachedDb };
  }
};

export const getDb = () => {
  if (!cachedDb) {
    cachedDb = new JsonDbAdapter();
  }
  return cachedDb;
};

