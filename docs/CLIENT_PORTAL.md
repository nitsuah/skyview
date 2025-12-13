# Client Portal Documentation

## Overview

The Skyview Client Portal provides a secure, professional way for clients to access and download their completed project files. This system includes:

- **Client Portal Login** (`client-portal.html`) - Secure access code authentication
- **Client Gallery** (`client-gallery.html`) - Project-specific file viewing and downloading

## Features

### For Clients

✅ Password-protected access via unique codes  
✅ View all project deliverables (photos, videos, RAW files)  
✅ Download individual files or complete project ZIP  
✅ Filter by file type (photos, videos, RAW)  
✅ Beautiful, responsive interface  
✅ Auto-redirect for convenience  

### For Business Owner

✅ Easy to share (send access code via email)  
✅ Professional branded experience  
✅ No manual file sending required  
✅ Scalable for multiple projects  

---

## How It Works (Current Prototype)

### 1. Access Code System

- Each client receives a unique access code (e.g., `PROJ2024-12345`)
- Codes can be sent via email with direct link: `https://yourdomain.com/client-portal.html?code=PROJ2024-12345`
- Client enters code to access their specific project

### 2. File Viewing

- Clients see thumbnails of all their deliverables
- Photos, videos, and RAW files are organized in a gallery
- Filter buttons allow sorting by file type

### 3. Downloads

- Individual file downloads
- "Download All" button for complete project package
- In production, this would trigger a ZIP file download

---

## Production Implementation Options

The current version is a **prototype/demo**. To make it fully functional, you have several options:

### Option 1: Netlify Identity + Netlify Functions (Recommended)

**Pros:** Fully integrated, secure, scalable  
**Cons:** Requires coding

**Setup:**

1. Use Netlify Identity for authentication (already set up for /admin)
2. Create Netlify Functions to handle file access
3. Store files in AWS S3 or Cloudinary
4. Generate pre-signed URLs for downloads

**Estimated Time:** 4-6 hours of development

---

### Option 2: Cloud Storage with Shared Links

**Pros:** Simplest, no coding required  
**Cons:** Less professional, manual process

**Services:**

- **Dropbox Business** - Password-protected folders
- **Google Drive** - Shared folders with access codes
- **OneDrive** - Secure sharing links

**Process:**

1. Upload project to folder
2. Generate password-protected link
3. Share link + password with client

**Cost:** ~$10-20/month for storage

---

### Option 3: Dedicated Client Portal Service

**Pros:** Ready-made, professional, no coding  
**Cons:** Monthly subscription, less customizable

**Services:**

- **Pic-Time** (for photographers) - $20-50/month
- **Pixieset** - Free-$60/month
- **ShootProof** - $10-25/month
- **Frame.io** (for video) - $20-45/month

These are purpose-built for delivering media files to clients.

---

### Option 4: Custom Development with Backend

**Pros:** Fully customized, complete control  
**Cons:** Requires significant development time

**Tech Stack:**

- Netlify Functions (serverless backend)
- AWS S3 or Cloudinary (file storage)
- Netlify Identity (authentication)
- PostgreSQL or Airtable (project database)

**Features You Could Add:**

- Client commenting on images
- Favorite/select system
- Watermarked previews
- Usage tracking
- Expiration dates
- Email notifications

**Estimated Time:** 15-20 hours of development  
**Cost:** Mostly time (services have free tiers initially)

---

## Recommended Implementation Path

**Phase 1 - Immediate (Free/Low-Cost):**

1. Use cloud storage service (Dropbox/Drive) for now
2. Send manual links to clients
3. Focus on delivering great work

**Phase 2 - Short-term (1-3 months):**

1. If delivering 5+ projects/month, invest in Pic-Time or Pixieset
2. Automate client delivery process
3. Professional gallery experience

**Phase 3 - Long-term (6+ months):**

1. If business grows, consider custom portal
2. Integrate with workflow (CRM, invoicing)
3. Add advanced features (watermarking, analytics)

---

## Current Files Structure

```text
client-portal.html          # Login page (access code entry)
client-gallery.html         # Gallery view (file browsing/download)
docs/CLIENT_PORTAL.md       # This documentation
```

---

## Email Template for Clients

When sending access codes to clients, use this template:

```text
Subject: Your Skyview Project Files Are Ready! 🎥

Hi [Client Name],

Your project is complete and ready for download! 

Access your files here:
https://yourdomain.com/client-portal.html?code=PROJ2024-12345

Your Access Code: PROJ2024-12345

What you'll find:
• High-resolution photos (JPG)
• 4K videos (MP4)
• RAW files (DNG) - for editing
• Complete project ZIP download

Files will be available for 90 days.

Questions? Reply to this email or call us at [phone].

Best regards,
Skyview Aerial Media

---
Follow us: [Instagram] [YouTube]
```

---

## Security Considerations

### Current Prototype

- ❌ Access codes not validated against database
- ❌ Files are publicly accessible (if URL is known)
- ❌ No access logging or expiration

### For Production

- ✅ Store access codes in secure database
- ✅ Use pre-signed URLs with expiration
- ✅ Log all access attempts
- ✅ Implement rate limiting
- ✅ Add 2FA for high-value projects

---

## Testing the Prototype

1. Open `client-portal.html` in browser
2. Enter any 8+ character code (demo mode)
3. View the gallery interface
4. Test filter buttons
5. Click download buttons (will show alert)

---

## Next Steps

1. **Choose implementation option** based on:
   - Current project volume
   - Budget
   - Technical comfort level
   - Growth plans

2. **Test with real clients:**
   - Use cloud storage initially
   - Gather feedback on what features matter
   - Decide if custom portal is worth investment

3. **Consider hybrid approach:**
   - Use cloud storage for large files
   - Custom portal for presentation/selection
   - Best of both worlds

---

## Support Resources

- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [AWS S3](https://aws.amazon.com/s3/)
- [Cloudinary](https://cloudinary.com/)
- [Pic-Time](https://www.pic-time.com/)
- [Pixieset](https://pixieset.com/)

---

## Questions?

If you want to implement this fully, consider:

1. Hiring a developer (5-10 hours of work)
2. Using a ready-made service (quickest)
3. Learning to build it yourself (most rewarding!)

The prototype shows clients what's possible. The implementation choice depends on your business needs and technical comfort.
