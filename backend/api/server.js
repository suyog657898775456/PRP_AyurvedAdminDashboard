const express = require("express");
const cors = require("cors");

const { Pool } = require("pg");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const jwt = require("jsonwebtoken");



require("dotenv").config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://prp-ayurved-frontend-feojxlpar-suyog657898775456s-projects.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());




// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://prp-ayurved-frontend-feojxlpar-suyog657898775456s-projects.vercel.app",
];




// ------------------------------------------
// 1. CONFIGURATION
// ------------------------------------------

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- ADMIN CARDS STORAGE ---
const adminCardStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "college_admin_cards",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const uploadAdminCardImg = multer({ storage: adminCardStorage });

const admissionStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // 1. Clean the filename (Remove spaces/special chars) to prevent 401 errors
    const cleanName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    return {
      folder: "college_admissions",
      resource_type: "raw", // Force "Raw File" mode (keeps it as a real PDF)
      type: "upload", // Force "Public" access
      public_id: cleanName, // Use the cleaned name
    };
  },
});

const uploadAdmissionPdf = multer({ storage: admissionStorage });

// --- DEPARTMENT STORAGE (Handle both Images and PDFs) ---
const departmentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === "application/pdf";
    return {
      folder: "department_assets",
      resource_type: isPdf ? "raw" : "image", // Auto-detect type
      type: "upload",
      access_mode: "public",
      public_id: file.originalname
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, ""),
    };
  },
});
const uploadDeptAssets = multer({ storage: departmentStorage });

// --- NCISM STORAGE ---
const ncismStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const cleanName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    return {
      folder: "ncism_documents",
      resource_type: "raw",
      type: "upload",
      access_mode: "public",
      public_id: cleanName,
    };
  },
});
const uploadNcismPdf = multer({ storage: ncismStorage });

// --- NEWS/NOTICES STORAGE ---
const newsStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "news_notices",
      resource_type: "auto", // Auto-detect pdf or image
      type: "upload",
      access_mode: "public",
      public_id: file.originalname
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, ""),
    };
  },
});
const uploadNews = multer({ storage: newsStorage });

// --- 1. SETUP STORAGE FOR EVENTS (Must come before the routes) ---
const eventStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "academic_events",
      resource_type: "auto", // Automatically detects image type
      type: "upload",
      access_mode: "public",
      public_id: file.originalname
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, ""),
    };
  },
});

// Define the 'uploadEvent' middleware variable here so the route can use it
const uploadEvent = multer({ storage: eventStorage });

// --- MUHS STORAGE ---
const muhsStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Clean filename
    const cleanName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    return {
      folder: "muhs_documents", // Separate folder in Cloudinary
      resource_type: "raw",
      type: "upload",
      access_mode: "public",
      public_id: cleanName,
    };
  },
});
const uploadMuhsPdf = multer({ storage: muhsStorage });

// --- HOSPITAL STORAGE ---
const hospitalStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "hospital_documents",
      resource_type: "raw",
      type: "upload",
      access_mode: "public",
      public_id: file.originalname
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, ""),
    };
  },
});
const uploadHospitalPdf = multer({ storage: hospitalStorage });

// --- HIGHLIGHTED EVENTS STORAGE ---
const highlightStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "highlighted_events",
      resource_type: "auto",
      type: "upload",
      access_mode: "public",
      public_id: file.originalname
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, ""),
    };
  },
});
const uploadHighlight = multer({ storage: highlightStorage });

// --- GALLERY STORAGE CONFIGURATION ---
const galleryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "website_gallery", // Separate folder for gallery images
      resource_type: "auto", // Automatically detect if it's an image or video
      public_id: `gallery_${Date.now()}_${file.originalname.split(".")[0]}`,
    };
  },
});

const uploadGallery = multer({ storage: galleryStorage });

// --- INSTITUTES STORAGE ---
const instituteStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "college_institutes",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const uploadInstitute = multer({ storage: instituteStorage });

// --- AUTHORITIES STORAGE (Inspiration/Pillars/Principal) ---
const authorityStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "college_authorities",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const uploadAuthority = multer({ storage: authorityStorage });

// 2. DATABASE CONNECTION (CRASH-PROOF FIX)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // This fixes the SSL handshake issue
  },
  // --- ADD THESE SETTINGS TO PREVENT TIMEOUTS ---
  connectionTimeoutMillis: 10000, // Wait 10s before failing if DB is sleeping
  idleTimeoutMillis: 0, // Disable auto-disconnection of idle clients (keeps connection alive)
  keepAlive: true, // Send keep-alive packets to prevent network dropouts
  max: 10, // Limit max connections to prevent overwhelming Neon
});

// Add this event listener to handle unexpected errors without crashing the server
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  // Don't exit process, just log it. The pool will reconnect automatically next time.
});

// Test the connection immediately on start
pool
  .connect()
  .then((client) => {
    console.log("✅ Successfully connected to Neon PostgreSQL");
    client.release();
  })
  .catch((err) => {
    console.error("❌ Database Connection Error:", err.message);
  });

// ------------------------------------------
// 3. ROUTES
// ------------------------------------------





// --- ADMIN LOGIN ---
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "24h" },
    );

    return res.json({
      success: true,
      token: token,
      admin: { name: "Super Admin", role: "admin" },
    });
  }

  return res
    .status(401)
    .json({ success: false, message: "Invalid credentials" });
});

// --- ADMISSION ROUTES (NEW) ---

// GET ADMISSIONS
app.get("/api/admissions", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM admissions ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching admissions:", err);
    // If table doesn't exist, return empty array instead of crashing
    if (err.code === "42P01") return res.json([]);
    res.status(500).json({ error: "Database error" });
  }
});

// ADD ADMISSION (DEBUG VERSION)
app.post(
  "/api/admissions",
  uploadAdmissionPdf.single("pdfFile"),
  async (req, res) => {
    try {
      const { title } = req.body;
      const file = req.file;

      console.log("📝 Debug - Title:", title);

      // Check if file is missing (Cloudinary failed or file not sent)
      if (!file) {
        console.log("❌ Debug - No file received (Multer/Cloudinary issue)");
      } else {
        console.log("📂 Debug - File uploaded to:", file.path);
      }

      let query, values;

      if (file) {
        query =
          "INSERT INTO admissions (title, pdf_name, pdf_path, uploaded_date) VALUES ($1, $2, $3, CURRENT_DATE) RETURNING *";
        values = [title, file.originalname, file.path];
      } else {
        query = "INSERT INTO admissions (title) VALUES ($1) RETURNING *";
        values = [title];
      }

      const result = await pool.query(query, values);
      console.log("✅ Success! Saved to DB:", result.rows[0]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      // THIS FIXES THE [object Object] MESSAGE
      console.error("❌ ERROR DETAILS:", JSON.stringify(err, null, 2));

      res.status(500).json({
        error: "Server Error",
        details: err.message || JSON.stringify(err),
      });
    }
  },
);

// DELETE ADMISSION
app.delete("/api/admissions/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM admissions WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting admission:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- ADD THIS NEW ROUTE TO SERVER.JS ---

// EDIT (UPDATE) ADMISSION
app.put(
  "/api/admissions/:id",
  uploadAdmissionPdf.single("pdfFile"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const file = req.file;

      let query, values;

      if (file) {
        // Case 1: User uploaded a NEW file (Update Title + File + Date)
        // Note: Cloudinary handles the upload via middleware before this runs
        query = `
        UPDATE admissions 
        SET title = $1, pdf_name = $2, pdf_path = $3, uploaded_date = CURRENT_DATE 
        WHERE id = $4 
        RETURNING *
      `;
        // Cloudinary puts the new URL in file.path
        values = [title, file.originalname, file.path, id];
      } else {
        // Case 2: User kept the OLD file (Update Title Only)
        query = "UPDATE admissions SET title = $1 WHERE id = $2 RETURNING *";
        values = [title, id];
      }

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Admission not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Update error:", err);
      res.status(500).json({ error: "Update failed" });
    }
  },
);

// --- IMPORTANT LINKS ROUTES ---

// GET LINKS
app.get("/api/links", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM important_links ORDER BY id DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load links" });
  }
});

// ADD LINK
app.post("/api/links", async (req, res) => {
  try {
    const { title, url } = req.body;
    const result = await pool.query(
      "INSERT INTO important_links (title, url) VALUES ($1, $2) RETURNING *",
      [title, url],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to save link" });
  }
});

// UPDATE LINK
app.put("/api/links/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url } = req.body;
    const result = await pool.query(
      "UPDATE important_links SET title = $1, url = $2 WHERE id = $3 RETURNING *",
      [title, url, id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE LINK
app.delete("/api/links/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM important_links WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- COMMITTEES STORAGE CONFIGURATION ---
const committeeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Clean filename to prevent 401 errors
    const cleanName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    return {
      folder: "college_committees", // Separate folder for organization
      resource_type: "raw",
      type: "upload",
      access_mode: "public",
      public_id: cleanName,
    };
  },
});
const uploadCommitteePdf = multer({ storage: committeeStorage });

// --- COMMITTEES ROUTES ---

// 1. GET ALL
app.get("/api/committees", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM committees ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// 2. CREATE (POST)
app.post(
  "/api/committees",
  uploadCommitteePdf.single("pdfFile"),
  async (req, res) => {
    try {
      const { title } = req.body;
      const file = req.file;

      let query, values;
      if (file) {
        query =
          "INSERT INTO committees (title, pdf_name, pdf_path, uploaded_date) VALUES ($1, $2, $3, CURRENT_DATE) RETURNING *";
        values = [title, file.originalname, file.path];
      } else {
        query = "INSERT INTO committees (title) VALUES ($1) RETURNING *";
        values = [title];
      }

      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Save failed" });
    }
  },
);

// 3. UPDATE (PUT)
app.put(
  "/api/committees/:id",
  uploadCommitteePdf.single("pdfFile"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const file = req.file;

      let query, values;
      if (file) {
        // Update Title + File
        query =
          "UPDATE committees SET title = $1, pdf_name = $2, pdf_path = $3, uploaded_date = CURRENT_DATE WHERE id = $4 RETURNING *";
        values = [title, file.originalname, file.path, id];
      } else {
        // Update Title Only
        query = "UPDATE committees SET title = $1 WHERE id = $2 RETURNING *";
        values = [title, id];
      }

      const result = await pool.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Update failed" });
    }
  },
);

// 4. DELETE
app.delete("/api/committees/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM committees WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- PRINCIPAL STORAGE (For Profile Photo) ---
const principalStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "college_principal",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const uploadPrincipalImg = multer({ storage: principalStorage });

// --- PRINCIPAL ROUTES ---

// 1. GET Principal Details
app.get("/api/principal", async (req, res) => {
  try {
    // Always fetch the first row (ID=1) since there's only one principal

    const result = await pool.query(
      "SELECT * FROM principal_details ORDER BY id DESC LIMIT 1",
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch principal details" });
  }
});

// 2. UPDATE Principal Details
app.put(
  "/api/principal",
  uploadPrincipalImg.single("image"),
  async (req, res) => {
    try {
      const {
        name,
        designation,
        messageTitle,
        content,
        qualifications,
        experience,
        specialization,
        email,
        mobile,
        address,
      } = req.body;

      const file = req.file;

      // Check if a row exists
      const check = await pool.query("SELECT * FROM principal_details LIMIT 1");

      if (check.rows.length === 0) {
        // INSERT (First time)
        const imageUrl = file ? file.path : "";
        await pool.query(
          `INSERT INTO principal_details 
        (name, designation, message_title, content, qualifications, experience, specialization, email, mobile, address, image_url) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            name,
            designation,
            messageTitle,
            content,
            qualifications,
            experience,
            specialization,
            email,
            mobile,
            address,
            imageUrl,
          ],
        );
      } else {
        // UPDATE (Existing)
        let query, values;

        if (file) {
          // Update everything INCLUDING image
          query = `UPDATE principal_details SET 
          name=$1, designation=$2, message_title=$3, content=$4, qualifications=$5, 
          experience=$6, specialization=$7, email=$8, mobile=$9, address=$10, image_url=$11, updated_at=CURRENT_TIMESTAMP 
          WHERE id = (SELECT id FROM principal_details LIMIT 1) RETURNING *`;
          values = [
            name,
            designation,
            messageTitle,
            content,
            qualifications,
            experience,
            specialization,
            email,
            mobile,
            address,
            file.path,
          ];
        } else {
          // Update info BUT KEEP old image
          query = `UPDATE principal_details SET 
          name=$1, designation=$2, message_title=$3, content=$4, qualifications=$5, 
          experience=$6, specialization=$7, email=$8, mobile=$9, address=$10, updated_at=CURRENT_TIMESTAMP 
          WHERE id = (SELECT id FROM principal_details LIMIT 1) RETURNING *`;
          values = [
            name,
            designation,
            messageTitle,
            content,
            qualifications,
            experience,
            specialization,
            email,
            mobile,
            address,
          ];
        }

        const result = await pool.query(query, values);
        res.json(result.rows[0]);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Update failed" });
    }
  },
);

app.get("/api/admin-cards", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM admin_cards ORDER BY id ASC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cards" });
  }
});

// 2. CREATE CARD
app.post(
  "/api/admin-cards",
  uploadAdminCardImg.single("image"),
  async (req, res) => {
    try {
      const { name, title, noteTitle, salutation, content } = req.body;
      const imageUrl = req.file ? req.file.path : "";

      const result = await pool.query(
        `INSERT INTO admin_cards (name, title, note_title, salutation, content, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, title, noteTitle, salutation, content, imageUrl],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Save failed" });
    }
  },
);

// 3. UPDATE CARD
app.put(
  "/api/admin-cards/:id",
  uploadAdminCardImg.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, title, noteTitle, salutation, content } = req.body;
      const file = req.file;

      let query, values;
      if (file) {
        query = `UPDATE admin_cards SET name=$1, title=$2, note_title=$3, salutation=$4, content=$5, image_url=$6 WHERE id=$7 RETURNING *`;
        values = [name, title, noteTitle, salutation, content, file.path, id];
      } else {
        query = `UPDATE admin_cards SET name=$1, title=$2, note_title=$3, salutation=$4, content=$5 WHERE id=$6 RETURNING *`;
        values = [name, title, noteTitle, salutation, content, id];
      }

      const result = await pool.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Update failed" });
    }
  },
);

// 4. DELETE CARD
app.delete("/api/admin-cards/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM admin_cards WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- NCISM ROUTES ---

// 1. GET ALL NCISM DATA (Nested)
app.get("/api/ncism", async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id, t.title,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'sectionTitle', s.title,
              'files', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'fileName', p.name, 
                    'url', p.pdf_path,
                    'uploadDate', p.uploaded_date
                  )
                ), '[]')
                FROM ncism_pdfs p WHERE p.section_id = s.id
              )
            ) ORDER BY s.id
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) as sections
      FROM ncism_tabs t
      LEFT JOIN ncism_sections s ON t.id = s.tab_id
      GROUP BY t.id
      ORDER BY t.id DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load NCISM data" });
  }
});

// 2. CREATE or FULL SYNC (Save Tab + Sections + Files)
app.post("/api/ncism", uploadNcismPdf.any(), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { tabData } = req.body;
    const data = JSON.parse(tabData);
    const files = req.files || [];

    // A. Create or Update Tab
    let tabId = data.id;
    // If ID is a timestamp (frontend generated), treat as new
    if (!tabId || String(tabId).length > 10) {
      const tabRes = await client.query(
        "INSERT INTO ncism_tabs (title) VALUES ($1) RETURNING id",
        [data.title],
      );
      tabId = tabRes.rows[0].id;
    } else {
      await client.query("UPDATE ncism_tabs SET title = $1 WHERE id = $2", [
        data.title,
        tabId,
      ]);
      // Clear old sections to sync new state (simplifies logic)
      await client.query("DELETE FROM ncism_sections WHERE tab_id = $1", [
        tabId,
      ]);
    }

    // B. Insert Sections
    for (const section of data.sections) {
      const secRes = await client.query(
        "INSERT INTO ncism_sections (tab_id, title) VALUES ($1, $2) RETURNING id",
        [tabId, section.sectionTitle],
      );
      const newSecId = secRes.rows[0].id;

      // C. Insert Files
      for (const pdf of section.files) {
        let pdfUrl = pdf.url;

        // Check if this is a newly uploaded file (linked via tempId)
        if (pdf.tempId) {
          const uploadedFile = files.find((f) => f.fieldname === pdf.tempId);
          if (uploadedFile) {
            pdfUrl = uploadedFile.path;
          }
        }

        if (pdfUrl) {
          await client.query(
            "INSERT INTO ncism_pdfs (section_id, name, pdf_path, uploaded_date) VALUES ($1, $2, $3, CURRENT_DATE)",
            [newSecId, pdf.name, pdfUrl],
          );
        }
      }
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Save failed" });
  } finally {
    client.release();
  }
});

// 3. DELETE TAB
app.delete("/api/ncism/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM ncism_tabs WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- MUHS ROUTES ---

// 1. GET ALL MUHS DATA
app.get("/api/muhs", async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id, t.title,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'sectionTitle', s.title,
              'files', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'fileName', p.name, 
                    'url', p.pdf_path,
                    'uploadDate', p.uploaded_date
                  )
                ), '[]')
                FROM muhs_pdfs p WHERE p.section_id = s.id
              )
            ) ORDER BY s.id
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) as sections
      FROM muhs_tabs t
      LEFT JOIN muhs_sections s ON t.id = s.tab_id
      GROUP BY t.id
      ORDER BY t.title DESC; -- Order by Year (Title) usually
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load MUHS data" });
  }
});

// 2. SAVE (CREATE/UPDATE) MUHS TAB
app.post("/api/muhs", uploadMuhsPdf.any(), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { tabData } = req.body;
    const data = JSON.parse(tabData);
    const files = req.files || [];

    // A. Create or Update Tab
    let tabId = data.id;
    // Check if ID is a temporary frontend ID (timestamp) or real DB ID
    if (!tabId || String(tabId).length > 10) {
      const tabRes = await client.query(
        "INSERT INTO muhs_tabs (title) VALUES ($1) RETURNING id",
        [data.title],
      );
      tabId = tabRes.rows[0].id;
    } else {
      await client.query("UPDATE muhs_tabs SET title = $1 WHERE id = $2", [
        data.title,
        tabId,
      ]);
      // Wipe old sections to sync new state
      await client.query("DELETE FROM muhs_sections WHERE tab_id = $1", [
        tabId,
      ]);
    }

    // B. Insert Sections
    for (const section of data.sections) {
      const secRes = await client.query(
        "INSERT INTO muhs_sections (tab_id, title) VALUES ($1, $2) RETURNING id",
        [tabId, section.sectionTitle],
      );
      const newSecId = secRes.rows[0].id;

      // C. Insert Files
      for (const pdf of section.files) {
        let pdfUrl = pdf.url;

        // If new file upload (linked via tempId)
        if (pdf.tempId) {
          const uploadedFile = files.find((f) => f.fieldname === pdf.tempId);
          if (uploadedFile) {
            pdfUrl = uploadedFile.path;
          }
        }

        if (pdfUrl) {
          await client.query(
            "INSERT INTO muhs_pdfs (section_id, name, pdf_path, uploaded_date) VALUES ($1, $2, $3, CURRENT_DATE)",
            [newSecId, pdf.name, pdfUrl],
          );
        }
      }
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Save failed" });
  } finally {
    client.release();
  }
});

// 3. DELETE MUHS TAB
app.delete("/api/muhs/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM muhs_tabs WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- DEPARTMENT ROUTES ---

// 1. GET ALL DEPARTMENTS (Nested JSON)
app.get("/api/departments", async (req, res) => {
  try {
    const query = `
      SELECT 
        d.id, d.name as title,
        json_build_object(
          'id', d.id, -- Using dept ID as section ID for simplicity
          'description', (SELECT description FROM department_details WHERE department_id = d.id LIMIT 1),
          'pdfs', COALESCE((
            SELECT json_agg(json_build_object(
              'id', p.id, 'title', p.title, 'fileName', p.file_name, 
              'url', p.file_url, 'fileSize', p.file_size, 'uploadDate', p.upload_date
            )) FROM department_pdfs p WHERE p.department_id = d.id
          ), '[]'),
          'photos', COALESCE((
            SELECT json_agg(json_build_object(
              'id', ph.id, 'fileName', ph.file_name, 'url', ph.photo_url
            )) FROM department_photos ph WHERE ph.department_id = d.id
          ), '[]'),
          'videos', COALESCE((
            SELECT json_agg(json_build_object(
              'id', v.id, 'title', v.title, 'url', v.video_url
            )) FROM department_videos v WHERE v.department_id = d.id
          ), '[]')
        ) as section
      FROM departments d
      ORDER BY d.id ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load departments" });
  }
});

// 2. SAVE (CREATE/UPDATE) DEPARTMENT
app.post("/api/departments", uploadDeptAssets.any(), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { departmentData } = req.body;
    const data = JSON.parse(departmentData);
    const files = req.files || [];

    // A. Create or Update Department Name
    let deptId = data.id;
    if (!deptId || String(deptId).length > 10) {
      const res = await client.query(
        "INSERT INTO departments (name) VALUES ($1) RETURNING id",
        [data.title],
      );
      deptId = res.rows[0].id;
    } else {
      await client.query("UPDATE departments SET name = $1 WHERE id = $2", [
        data.title,
        deptId,
      ]);
    }

    // B. Update Description
    await client.query(
      "DELETE FROM department_details WHERE department_id = $1",
      [deptId],
    );
    if (data.section.description) {
      await client.query(
        "INSERT INTO department_details (department_id, description) VALUES ($1, $2)",
        [deptId, data.section.description],
      );
    }

    // C. Handle PDFs (Wipe and Re-insert logic for sync)
    // Note: In production, you might want to be smarter to save DB IDs, but wiping is safer for consistency here
    await client.query("DELETE FROM department_pdfs WHERE department_id = $1", [
      deptId,
    ]);
    for (const pdf of data.section.pdfs) {
      let url = pdf.url;
      // If new file upload
      if (pdf.tempId) {
        const uploaded = files.find((f) => f.fieldname === pdf.tempId);
        if (uploaded) url = uploaded.path;
      }
      if (url && !url.startsWith("blob:")) {
        await client.query(
          "INSERT INTO department_pdfs (department_id, title, file_name, file_url, file_size, upload_date) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)",
          [deptId, pdf.title, pdf.fileName, url, pdf.fileSize || "0 MB"],
        );
      }
    }

    // D. Handle Photos
    await client.query(
      "DELETE FROM department_photos WHERE department_id = $1",
      [deptId],
    );
    for (const photo of data.section.photos) {
      let url = photo.url;
      // If new file upload
      if (photo.tempId) {
        const uploaded = files.find((f) => f.fieldname === photo.tempId);
        if (uploaded) url = uploaded.path;
      }
      if (url && !url.startsWith("blob:")) {
        await client.query(
          "INSERT INTO department_photos (department_id, file_name, photo_url) VALUES ($1, $2, $3)",
          [deptId, photo.fileName, url],
        );
      }
    }

    // E. Handle Videos
    await client.query(
      "DELETE FROM department_videos WHERE department_id = $1",
      [deptId],
    );
    for (const video of data.section.videos) {
      await client.query(
        "INSERT INTO department_videos (department_id, title, video_url) VALUES ($1, $2, $3)",
        [deptId, video.title, video.url],
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Save failed" });
  } finally {
    client.release();
  }
});

// 3. DELETE DEPARTMENT
app.delete("/api/departments/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM departments WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- HOSPITAL ROUTES ---

// 1. GET ALL HOSPITAL DATA
app.get("/api/hospital", async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id, t.title,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'sectionTitle', s.title,
              'pdfFiles', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'url', p.pdf_path,
                    'uploadedDate', p.uploaded_date
                  )
                ), '[]')
                FROM hospital_pdfs p WHERE p.section_id = s.id
              )
            ) ORDER BY s.id
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) as sections
      FROM hospital_tabs t
      LEFT JOIN hospital_sections s ON t.id = s.tab_id
      GROUP BY t.id
      ORDER BY t.id DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load hospital data" });
  }
});

// 2. SAVE (CREATE/UPDATE) HOSPITAL TAB
app.post("/api/hospital", uploadHospitalPdf.any(), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { tabData } = req.body;
    const data = JSON.parse(tabData);
    const files = req.files || [];

    // A. Create or Update Tab
    let tabId = data.id;
    if (!tabId || String(tabId).length > 10) {
      const tabRes = await client.query(
        "INSERT INTO hospital_tabs (title) VALUES ($1) RETURNING id",
        [data.title],
      );
      tabId = tabRes.rows[0].id;
    } else {
      await client.query("UPDATE hospital_tabs SET title = $1 WHERE id = $2", [
        data.title,
        tabId,
      ]);
      // Wipe old sections to sync
      await client.query("DELETE FROM hospital_sections WHERE tab_id = $1", [
        tabId,
      ]);
    }

    // B. Insert Sections
    for (const section of data.sections) {
      const secRes = await client.query(
        "INSERT INTO hospital_sections (tab_id, title) VALUES ($1, $2) RETURNING id",
        [tabId, section.sectionTitle],
      );
      const newSecId = secRes.rows[0].id;

      // C. Insert Files
      for (const pdf of section.pdfFiles) {
        let pdfUrl = pdf.url;

        // If new file upload (linked via tempId)
        if (pdf.tempId) {
          const uploadedFile = files.find((f) => f.fieldname === pdf.tempId);
          if (uploadedFile) {
            pdfUrl = uploadedFile.path;
          }
        }

        if (pdfUrl) {
          await client.query(
            "INSERT INTO hospital_pdfs (section_id, name, pdf_path, uploaded_date) VALUES ($1, $2, $3, CURRENT_DATE)",
            [newSecId, pdf.name, pdfUrl],
          );
        }
      }
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Save failed" });
  } finally {
    client.release();
  }
});

// 3. DELETE HOSPITAL TAB
app.delete("/api/hospital/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM hospital_tabs WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// 1. GET ALL ITEMS
app.get("/api/news-notices", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, title, type, file_type as "fileType", 
        file_url as "fileUrl", file_name as "fileName", 
        file_size as "fileSize", 
        TO_CHAR(upload_date, 'YYYY-MM-DD') as "uploadDate"
      FROM news_notices 
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// 2. SAVE (CREATE/UPDATE) ITEM
app.post("/api/news-notices", uploadNews.single("file"), async (req, res) => {
  try {
    const {
      id,
      title,
      type,
      fileType,
      linkUrl,
      existingFileUrl,
      existingFileName,
      existingFileSize,
    } = req.body;
    let fileUrl = linkUrl;
    let fileName = linkUrl;
    let fileSize = "-";

    // Handle File Upload
    if (req.file) {
      fileUrl = req.file.path;
      fileName = req.file.originalname;
      fileSize = `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`;
    }
    // Handle Existing File (if editing and no new file selected)
    else if (existingFileUrl && fileType !== "link") {
      fileUrl = existingFileUrl;
      fileName = existingFileName;
      fileSize = existingFileSize;
    }

    if (id) {
      // UPDATE
      await pool.query(
        `UPDATE news_notices 
         SET title=$1, type=$2, file_type=$3, file_url=$4, file_name=$5, file_size=$6 
         WHERE id=$7`,
        [title, type, fileType, fileUrl, fileName, fileSize, id],
      );
    } else {
      // INSERT
      await pool.query(
        `INSERT INTO news_notices (title, type, file_type, file_url, file_name, file_size) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [title, type, fileType, fileUrl, fileName, fileSize],
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Save failed" });
  }
});

// 3. DELETE ITEM
app.delete("/api/news-notices/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM news_notices WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- EVENTS ROUTES ---

// GET ALL EVENTS
app.get("/api/events", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, title, 
        TO_CHAR(event_date, 'YYYY-MM-DD') as date, 
        event_time as time, location, description, 
        cover_image as "coverImage", 
        additional_images as "additionalImages", 
        videos
      FROM upcoming_events 
      ORDER BY event_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// SAVE (CREATE/UPDATE) EVENT
// Handles multiple files: 1 cover image, up to 10 gallery images
app.post(
  "/api/events",
  uploadEvent.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const {
        id,
        title,
        date,
        time,
        location,
        description,
        videos,
        existingCoverImage,
        existingAdditionalImages,
      } = req.body;

      // Handle Cover Image
      let coverImageUrl = existingCoverImage || null;
      if (req.files && req.files["coverImage"]) {
        coverImageUrl = req.files["coverImage"][0].path;
      }

      // Handle Additional Images
      let additionalImagesUrls = existingAdditionalImages
        ? JSON.parse(existingAdditionalImages)
        : [];
      if (req.files && req.files["additionalImages"]) {
        const newImages = req.files["additionalImages"].map((f) => f.path);
        additionalImagesUrls = [...additionalImagesUrls, ...newImages];
      }

      // Handle Videos
      const videoLinks = videos ? JSON.parse(videos) : [];

      if (id) {
        // UPDATE
        await pool.query(
          `UPDATE upcoming_events 
         SET title=$1, event_date=$2, event_time=$3, location=$4, description=$5, 
             cover_image=$6, additional_images=$7, videos=$8 
         WHERE id=$9`,
          [
            title,
            date,
            time,
            location,
            description,
            coverImageUrl,
            additionalImagesUrls,
            videoLinks,
            id,
          ],
        );
      } else {
        // INSERT
        await pool.query(
          `INSERT INTO upcoming_events (title, event_date, event_time, location, description, cover_image, additional_images, videos) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            title,
            date,
            time,
            location,
            description,
            coverImageUrl,
            additionalImagesUrls,
            videoLinks,
          ],
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving event:", err);
      res.status(500).json({ error: "Save failed" });
    }
  },
);

// DELETE EVENT
app.delete("/api/events/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM upcoming_events WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- HIGHLIGHTED EVENTS ROUTES ---

// 1. GET ALL
app.get("/api/highlighted-events", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, title, 
        TO_CHAR(event_date, 'YYYY-MM-DD') as date, 
        event_time as time, location, description, 
        cover_image as "coverImage", 
        additional_images as "additionalImages", 
        videos
      FROM highlighted_events 
      ORDER BY event_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// 2. SAVE (CREATE/UPDATE)
app.post(
  "/api/highlighted-events",
  uploadHighlight.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const {
        id,
        title,
        date,
        time,
        location,
        description,
        videos,
        existingCoverImage,
        existingAdditionalImages,
      } = req.body;

      // Cover Image
      let coverImageUrl = existingCoverImage || null;
      if (req.files && req.files["coverImage"]) {
        coverImageUrl = req.files["coverImage"][0].path;
      }

      // Additional Images
      let additionalImagesUrls = existingAdditionalImages
        ? JSON.parse(existingAdditionalImages)
        : [];
      if (req.files && req.files["additionalImages"]) {
        const newImages = req.files["additionalImages"].map((f) => f.path);
        additionalImagesUrls = [...additionalImagesUrls, ...newImages];
      }

      // Videos
      const videoLinks = videos ? JSON.parse(videos) : [];

      if (id) {
        // UPDATE
        await pool.query(
          `UPDATE highlighted_events 
         SET title=$1, event_date=$2, event_time=$3, location=$4, description=$5, 
             cover_image=$6, additional_images=$7, videos=$8 
         WHERE id=$9`,
          [
            title,
            date,
            time,
            location,
            description,
            coverImageUrl,
            additionalImagesUrls,
            videoLinks,
            id,
          ],
        );
      } else {
        // INSERT
        await pool.query(
          `INSERT INTO highlighted_events (title, event_date, event_time, location, description, cover_image, additional_images, videos) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            title,
            date,
            time,
            location,
            description,
            coverImageUrl,
            additionalImagesUrls,
            videoLinks,
          ],
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Save failed" });
    }
  },
);

// 3. DELETE
app.delete("/api/highlighted-events/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM highlighted_events WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- OUR INSTITUTES ROUTES ---

// 1. GET ALL
app.get("/api/institutes", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, image_url as image, TO_CHAR(created_at, 'YYYY-MM-DD') as \"createdAt\" FROM our_institutes ORDER BY id DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch institutes" });
  }
});

// 2. CREATE / UPDATE
app.post(
  "/api/institutes",
  uploadInstitute.single("imageFile"),
  async (req, res) => {
    try {
      const { id, title, existingImage } = req.body;
      const file = req.file;
      let imageUrl = existingImage;

      if (file) {
        imageUrl = file.path;
      }

      if (id && !isNaN(id)) {
        // UPDATE
        const result = await pool.query(
          'UPDATE our_institutes SET title = $1, image_url = $2 WHERE id = $3 RETURNING id, title, image_url as image, created_at as "createdAt"',
          [title, imageUrl, id],
        );
        res.json(result.rows[0]);
      } else {
        // INSERT
        const result = await pool.query(
          'INSERT INTO our_institutes (title, image_url) VALUES ($1, $2) RETURNING id, title, image_url as image, created_at as "createdAt"',
          [title, imageUrl],
        );
        res.status(201).json(result.rows[0]);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Operation failed" });
    }
  },
);

// 3. DELETE
app.delete("/api/institutes/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM our_institutes WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// 1. GET ALL DATA
app.get("/api/authorities", async (req, res) => {
  try {
    const insp = await pool.query("SELECT * FROM inspiration WHERE id = 1");
    const pill = await pool.query("SELECT * FROM pillars ORDER BY id ASC");
    const prin = await pool.query("SELECT * FROM principal_data WHERE id = 1");

    res.json({
      inspiration: insp.rows[0] || {},
      pillars: pill.rows || [],
      principal: prin.rows[0] || {},
    });
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch authorities" });
  }
});

// 2. UPDATE INSPIRATION / PRINCIPAL (Bug-Proof Single Row)
app.post(
  "/api/authorities/single",
  uploadAuthority.single("imageFile"),
  async (req, res) => {
    const { type, name, desc, role, existingImage } = req.body;
    const imageUrl = req.file ? req.file.path : existingImage;

    let tableName =
      type === "inspiration"
        ? "inspiration"
        : type === "principal"
          ? "principal_data"
          : null;
    if (!tableName)
      return res.status(400).json({ error: "Invalid authority type" });

    try {
      // Humne variables ko yahan handle kiya hai taaki agar role empty ho to handle ho jaye
      const query = `
      INSERT INTO ${tableName} (id, name, description, role, image_url)
      VALUES (1, $1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name, 
          description = EXCLUDED.description, 
          role = EXCLUDED.role, 
          image_url = EXCLUDED.image_url
      RETURNING *`;

      const values = [
        name || "",
        desc || "",
        role || (type === "principal" ? "Principal" : ""), // Default role logic
        imageUrl || "",
      ];

      const result = await pool.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error("❌ Single Update Error:", err.message);
      res.status(500).json({ error: "Update failed", details: err.message });
    }
  },
);

// 3. PILLAR ROUTES (Multiple Rows)
app.post(
  "/api/authorities/pillar",
  uploadAuthority.single("imageFile"),
  async (req, res) => {
    try {
      const { id, name, role, desc, existingImage } = req.body;
      const imageUrl = req.file ? req.file.path : existingImage;

      // logic: id tabhi update hoga jab wo real serial id ho (chhoti length)
      if (id && !isNaN(id) && String(id).length < 10) {
        const result = await pool.query(
          "UPDATE pillars SET name=$1, role=$2, description=$3, image_url=$4 WHERE id=$5 RETURNING *",
          [name, role, desc, imageUrl, id],
        );
        res.json(result.rows[0]);
      } else {
        // Create new Pillar
        const result = await pool.query(
          "INSERT INTO pillars (name, role, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *",
          [name, role, desc, imageUrl],
        );
        res.status(201).json(result.rows[0]);
      }
    } catch (err) {
      console.error("❌ Pillar Error:", err.message);
      res.status(500).json({ error: "Pillar operation failed" });
    }
  },
);

// 4. DELETE PILLAR
app.delete("/api/authorities/pillar/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM pillars WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

app.get("/api/contact", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM contact_info ORDER BY id LIMIT 1",
  );
  res.json(result.rows);
});

app.put("/api/contact/:id", async (req, res) => {
  const { id } = req.params;
  const {
    address,
    phone,
    alternate_phone,
    email,
    map_link,
    facebook,
    instagram,
    youtube,
    google,
    whatsapp,
  } = req.body;

  const query = `
    UPDATE contact_info 
    SET address=$1, phone=$2, alternate_phone=$3, email=$4, map_link=$5, 
        facebook=$6, instagram=$7, youtube=$8, google=$9, whatsapp=$10 
    WHERE id=$11 RETURNING *`;

  const values = [
    address,
    phone,
    alternate_phone,
    email,
    map_link,
    facebook,
    instagram,
    youtube,
    google,
    whatsapp,
    id,
  ];
  const result = await pool.query(query, values);
  res.json(result.rows[0]);
});

// Get all slider images
app.get("/api/slider", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM home_slider ORDER BY id ASC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// Upload new slider image (using the Cloudinary logic from previous steps)
app.post(
  "/api/slider",
  uploadAuthority.single("imageFile"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ error: "No image uploaded" });

      const result = await pool.query(
        "INSERT INTO home_slider (image_url, public_id) VALUES ($1, $2) RETURNING *",
        [req.file.path, req.file.filename],
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Upload failed" });
    }
  },
);

// Delete slider image
app.delete("/api/slider/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get public_id from DB to delete from Cloudinary
    const imgData = await pool.query(
      "SELECT public_id FROM home_slider WHERE id = $1",
      [id],
    );
    if (imgData.rows[0]?.public_id) {
      await cloudinary.uploader.destroy(imgData.rows[0].public_id);
    }

    // 2. Delete from DB
    await pool.query("DELETE FROM home_slider WHERE id = $1", [id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- VIDEO ROUTES ---

// 1. Get all videos
app.get("/api/gallery/videos", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM gallery_videos ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

// 2. Create or Update Video
app.post("/api/gallery/videos", async (req, res) => {
  const { id, title, url, description, featured } = req.body;
  try {
    if (id) {
      // Update logic
      const result = await pool.query(
        "UPDATE gallery_videos SET title=$1, url=$2, description=$3, featured=$4 WHERE id=$5 RETURNING *",
        [title, url, description, featured, id],
      );
      return res.json(result.rows[0]);
    }
    // Create logic
    const result = await pool.query(
      "INSERT INTO gallery_videos (title, url, description, featured) VALUES ($1, $2, $3, $4) RETURNING *",
      [title, url, description, featured || false],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to save video" });
  }
});

// 3. Delete Video
app.delete("/api/gallery/videos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM gallery_videos WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ message: "Video deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete video" });
  }
});

// --- IMAGE ROUTES ---

// 1. Get all images (IMPORTANT: Ye pehle missing tha)
app.get("/api/gallery/images", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM gallery_images ORDER BY id DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// 2. Upload Multiple Images to Cloudinary and DB
app.post(
  "/api/gallery/images",
  uploadAuthority.array("imageFiles"),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const uploadPromises = req.files.map((file) =>
        pool.query(
          "INSERT INTO gallery_images (image_url, public_id, title) VALUES ($1, $2, $3) RETURNING *",
          [file.path, file.filename, file.originalname],
        ),
      );

      const results = await Promise.all(uploadPromises);
      res.status(200).json(results.map((r) => r.rows[0]));
    } catch (err) {
      console.error("Server Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  },
);

// 3. Delete Image from Cloudinary and DB
app.delete("/api/gallery/images/:id", async (req, res) => {
  try {
    // Pehle Cloudinary ki public_id nikaalein
    const imgData = await pool.query(
      "SELECT public_id FROM gallery_images WHERE id = $1",
      [req.params.id],
    );

    if (imgData.rows.length > 0 && imgData.rows[0].public_id) {
      // Cloudinary se delete karein
      await cloudinary.uploader.destroy(imgData.rows[0].public_id);
    }

    // DB se delete karein
    await pool.query("DELETE FROM gallery_images WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete image" });
  }
});

app.post(
  "/api/highlighted-events",
  uploadHighlight.single("coverImage"),
  async (req, res) => {
    const { id, title, description, date, time, location, videos } = req.body;

    // Handle the videos array (sent as stringified JSON from frontend)
    const videoArray = typeof videos === "string" ? JSON.parse(videos) : videos;

    try {
      if (id && id !== "null") {
        // --- UPDATE EXISTING EVENT ---
        let query =
          "UPDATE highlighted_events SET title=$1, description=$2, date=$3, time=$4, location=$5, videos=$6, updated_at=NOW()";
        let params = [title, description, date, time, location, videoArray];

        if (req.file) {
          // If a new image is uploaded, update the URL and public_id
          query += ", cover_image=$7, public_id=$8 WHERE id=$9 RETURNING *";
          params.push(req.file.path, req.file.filename, id);
        } else {
          query += " WHERE id=$7 RETURNING *";
          params.push(id);
        }

        const result = await pool.query(query, params);
        res.json(result.rows[0]);
      } else {
        // --- CREATE NEW EVENT ---
        if (!req.file)
          return res.status(400).json({ error: "Cover image is required" });

        const result = await pool.query(
          "INSERT INTO highlighted_events (title, description, date, time, location, videos, cover_image, public_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
          [
            title,
            description,
            date,
            time,
            location,
            videoArray,
            req.file.path,
            req.file.filename,
          ],
        );
        res.json(result.rows[0]);
      }
    } catch (err) {
      console.error("Event Save Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  },
);

          

module.exports = app; 