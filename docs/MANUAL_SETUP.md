# Manual Setup Checklist

This document tracks configuration tasks that need to be completed in external services/dashboards.

## 🔧 Required Setup Tasks

### 0. Configure Feature Flags (2 min) ⚡ **DO THIS FIRST!**
**Status:** ⏳ Pending  
**Priority:** HIGH  
**Time Estimate:** 2 minutes

**What:** Control which parts of the website are visible

**Steps:**
1. Open `config.js` in the root folder
2. Review the feature flags:
   ```javascript
   features: {
       testimonials: false,    // Hidden by default
       contactForm: false,     // Hidden by default
       calendly: true,         // Enabled (ready to use!)
       // ... more flags
   }
   ```
3. Keep defaults for now OR enable what's ready:
   - `testimonials: true` - If you have real reviews
   - `contactForm: true` - If Netlify Forms is configured
   - `calendly: true` - Already enabled (configure URL below)

**Documentation:** `docs/CONFIG.md` for detailed guide

---

### 1. Decap CMS Admin Panel
**Status:** ⏳ Pending  
**Priority:** HIGH  
**Time Estimate:** 10-15 minutes

**Steps:**
1. Go to Netlify Dashboard → Identity
2. Enable Netlify Identity for your site
3. Go to Settings → Registration → Invite Only (recommended)
4. Invite yourself: Identity tab → Invite users → Enter your email
5. Check email and accept invitation
6. Visit `https://yourdomain.com/admin`
7. Log in with your Netlify Identity credentials
8. Start managing gallery assets!

**Documentation:** `/admin/config.yml` is already configured

---

### 2. Calendly Integration
**Status:** ⏳ Pending  
**Priority:** HIGH  
**Time Estimate:** 5 minutes

**Steps:**
1. Log into your Calendly account (or create one at https://calendly.com)
2. Create an "Event Type" (e.g., "15-Minute Consultation")
3. Copy your Calendly scheduling URL
   - Format: `https://calendly.com/your-username/consultation`
4. **Update `config.js`** (EASIER METHOD):
   ```javascript
   calendly: {
       url: 'https://calendly.com/YOUR-USERNAME/consultation',
       // ... rest of config
   }
   ```

**Current Config Location:** `config.js` line 30-35

---

### 3. Email Notifications (Netlify Forms)
**Status:** ⏳ Pending  
**Priority:** MEDIUM  
**Time Estimate:** 5 minutes

**Steps:**
1. Deploy site to Netlify (if not already done)
2. Submit a test form to activate Netlify Forms
3. Go to Netlify Dashboard → Forms
4. Click on "Form notifications"
5. Click "Add notification" → "Email notification"
6. Enter your email address to receive form submissions
7. **Enable in `config.js`:**
   ```javascript
   contactForm: true
   ```
8. Test by submitting another form

**Documentation:** `docs/EMAIL_NOTIFICATIONS.md`

---

### 4. Analytics Setup (Optional but Recommended)
**Status:** ⏳ Pending  
**Priority:** LOW  
**Time Estimate:** 10 minutes
**Update `config.js`:**
   ```javascript
   features: {
       analytics: true  // Enable
   },
   analytics: {
       provider: 'plausible',
       domain: 'yourdomain.com'  // Your actual domain
   }
   ```
4. Deploy changes - analytics will auto-load!

**Option B: Netlify Analytics (Easiest)**
1. Go to Netlify Dashboard → Analytics
2. Enable Netlify Analytics ($9/month add-on)
3. No code changes needed!

**Option C: GoatCounter (Free)**
1. Sign up at https://www.goatcounter.com
2. Follow their setup instructions
3. Add their script to `index.html`

**Documentation:** `docs/ANALYTICS_SETUP.md`

---

### 5. Domain & SSL (If not already done)
**Status:** ⏳ Pending  
**Priority:** HIGH (for production)  
**Time Estimate:** 20 minutes

**Steps:**
1. Purchase domain (e.g., skyviewaerial.com)
2. In Netlify Dashboard → Domain settings
3. Add custom domain
4. Configure DNS records (Netlify provides instructions)
5. SSL certificate will auto-provision (Let's Encrypt)

---

## ✅ Completed Setup

- [x] Contact form integration (Netlify Forms)
- [x] Booking section with Calendly widget placeholder
- [x] Thank you page after form submission
- [x] Analytics script prepared (needs account)
- [x] Admin CMS configuration file created

---

## 📋 Quick Start Order

**Before Launch:**
1. ✅ Deploy to Netlify
2. 🔧 Set up Netlify Identity + Decap CMS
3. 🔧 Update Calendly URL
4. 🔧 Configure email notifications

**After Launch:**
5. 🔧 Set up analytics
6. 🔧 Configure custom domain

---

## 💡 Tips

- **Test everything** on a Netlify preview/staging site first
- **Backup** your `admin/config.yml` if you make changes
- **Document** your Calendly URL and email addresses somewhere safe
- **Monitor** form submissions in first week to catch issues

---

## 🆘 Need Help?

- Netlify Docs: https://docs.netlify.com
- Decap CMS Docs: https://decapcms.org/docs
- Calendly Docs: https://help.calendly.com
- Project Docs: `/docs/` folder

---

**Last Updated:** December 13, 2025
