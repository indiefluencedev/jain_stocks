import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.NEXT_NEON_DB_URI;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is missing");
  process.exit(1);
}

const sql = neon(databaseUrl);

const DEMO_USERS = [
  {
    id: "usr_super_admin",
    username: "superadmin",
    name: "Super Admin",
    email: "superadmin@jainstock.com",
    role: "super_admin",
    phone: "+91 9876543210",
    status: "active",
    defaultDestinationId: "dest_01",
    password: "Jain@11614"
  },
  {
    id: "usr_owner",
    username: "owner",
    name: "Rajesh Jain (Owner)",
    email: "owner@jainstock.com",
    role: "owner",
    phone: "+91 9876543211",
    status: "active",
    defaultDestinationId: "dest_01",
    password: "Demo@2026"
  },
  {
    id: "usr_sales_mgr",
    username: "salesmgr",
    name: "Vikram Sharma (Sales Mgr)",
    email: "salesmgr@jainstock.com",
    role: "sales_manager",
    phone: "+91 9876543212",
    status: "active",
    defaultDestinationId: "dest_01",
    password: "Demo@2026"
  },
  {
    id: "usr_service_mgr",
    username: "servicemgr",
    name: "Amit Patel (Service Mgr)",
    email: "servicemgr@jainstock.com",
    role: "service_manager",
    phone: "+91 9876543213",
    status: "active",
    defaultDestinationId: "dest_02",
    password: "Demo@2026"
  },
  {
    id: "usr_wh_mgr",
    username: "whmgr",
    name: "Suresh Kumar (Warehouse Mgr)",
    email: "whmgr@jainstock.com",
    role: "warehouse_manager",
    phone: "+91 9876543214",
    status: "active",
    defaultDestinationId: "dest_01",
    password: "Demo@2026"
  },
  {
    id: "usr_stock_in",
    username: "stockin",
    name: "Ramesh Gupta (Stock In Specialist)",
    email: "stockin@jainstock.com",
    role: "stock_in",
    phone: "+91 9876543215",
    status: "active",
    defaultDestinationId: "dest_01",
    password: "Demo@2026"
  },
  {
    id: "usr_storekeeper",
    username: "storekeeper",
    name: "Dinesh Verma (Storekeeper)",
    email: "storekeeper@jainstock.com",
    role: "storekeeper",
    phone: "+91 9876543216",
    status: "active",
    defaultDestinationId: "dest_01",
    password: "Demo@2026"
  },
  {
    id: "usr_sales_rep",
    username: "salesrep",
    name: "Pooja Singh (Sales Executive)",
    email: "salesrep@jainstock.com",
    role: "sales_rep",
    phone: "+91 9876543217",
    status: "active",
    defaultDestinationId: "dest_01",
    password: "Demo@2026"
  },
  {
    id: "usr_viewer",
    username: "viewer",
    name: "Auditor / Guest Viewer",
    email: "viewer@jainstock.com",
    role: "viewer",
    phone: "+91 9876543218",
    status: "active",
    defaultDestinationId: "dest_01",
    password: "Demo@2026"
  }
];

const INITIAL_DESTINATIONS = [
  {
    id: "dest_01",
    name: "Main Central Warehouse",
    type: "Central Warehouse",
    code: "WH-MAIN",
    address: "Plot 42, Industrial Area Phase 1, City",
    contact_person: "Suresh Kumar",
    phone: "+91 9876543214",
    is_virtual: false,
    status: "active"
  },
  {
    id: "dest_02",
    name: "Showroom 1 (City Center)",
    type: "Showroom",
    code: "SH-CITY",
    address: "101 MG Road, Near Station",
    contact_person: "Vikram Sharma",
    phone: "+91 9876543212",
    is_virtual: false,
    status: "active"
  },
  {
    id: "dest_03",
    name: "Workshop & Service Center",
    type: "Workshop",
    code: "WS-SERVICE",
    address: "Ring Road Bypass, Service Bay #4",
    contact_person: "Amit Patel",
    phone: "+91 9876543213",
    is_virtual: false,
    status: "active"
  },
  {
    id: "dest_virtual_counter",
    name: "Virtual Counter Sales",
    type: "Virtual Location",
    code: "VIRT-COUNTER",
    address: "Virtual Transit Point",
    contact_person: "System Auto",
    phone: "+91 0000000000",
    is_virtual: true,
    status: "active"
  }
];

async function seedDatabase() {
  console.log("🌱 Seeding initial destinations & users into Neon PostgreSQL...");

  try {
    // 1. Seed Destinations
    for (const d of INITIAL_DESTINATIONS) {
      await sql`
        INSERT INTO "destinations" (id, name, type, code, address, contact_person, phone, is_virtual, status)
        VALUES (${d.id}, ${d.name}, ${d.type}, ${d.code}, ${d.address}, ${d.contact_person}, ${d.phone}, ${d.is_virtual}, ${d.status})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          code = EXCLUDED.code;
      `;
    }
    console.log("✅ Destinations seeded!");

    // 2. Seed Users
    for (const u of DEMO_USERS) {
      await sql`
        INSERT INTO "user" (id, name, email, "emailVerified", role, username, phone, status, "defaultDestinationId")
        VALUES (${u.id}, ${u.name}, ${u.email}, true, ${u.role}, ${u.username}, ${u.phone}, ${u.status}, ${u.defaultDestinationId})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          username = EXCLUDED.username,
          phone = EXCLUDED.phone,
          status = EXCLUDED.status;
      `;
    }
    console.log("✅ Default RBAC users seeded into Neon Postgres user table!");
  } catch (err) {
    console.error("❌ Error seeding database:", err);
    process.exit(1);
  }
}

seedDatabase();
