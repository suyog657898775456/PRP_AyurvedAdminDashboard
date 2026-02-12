
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("---------------------------------------");
console.log("🔍 TESTING CLOUDINARY CONNECTION...");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "Found (Hidden)" : "MISSING ❌");
console.log("---------------------------------------");

// Try to get account details to see if keys work
cloudinary.api.ping((error, result) => {
  if (error) {
    console.error("❌ CONNECTION FAILED:", error.message);
    console.error("👉 CHECK YOUR .ENV FILE! Ensure no spaces/quotes.");
  } else {
    console.log("✅ CONNECTION SUCCESSFUL!");
    console.log("Status:", result);
  }
});