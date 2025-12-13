# Asset Management & Admin Guide

Skyview uses a decentralized asset management system powered by **Decap CMS** (formerly Netlify CMS). This allows you to manage gallery images without touching code.

## 1. Accessing the Admin Panel

Once deployed to Netlify:
1.  Navigate to `yoursite.com/admin/`.
2.  Login with your **Netlify Identity** credentials (you will need to invite yourself from the Netlify Dashboard > Identity tab).

## 2. Managing Gallery Images

Inside the Admin Panel:
1.  Click on **Gallery** in the left sidebar.
2.  You will see a list of current images.
3.  **Add New**: Click "Add Items" to upload a new photo.
    *   **Image**: Upload directly from your computer. Note: Large files will be stored in the repository.
    *   **Alt Text**: Describe the image for accessibility.
    *   **Category**: Select the appropriate category for future filtering.
4.  **Publish**: Click "Publish" to save changes. This will automatically trigger a site deployment.

## 3. Using External Assets (Cloudinary/S3)

If you have large video files or want to host images externally:

### Option A: Manual JSON Edit
1.  Open `assets/gallery.json` in the codebase.
2.  Change the `src` field of an item to the full URL (e.g., `https://res.cloudinary.com/...`).

### Option B: Cloudinary Integration with Decap CMS
To enable direct Cloudinary uploads from the Admin panel:
1.  Open `admin/config.yml`.
2.  Add your Cloudinary configuration:
    ```yaml
    media_library:
      name: cloudinary
      config:
        cloud_name: your_cloud_name
        api_key: your_api_key
    ```
3.  This prevents bloating the git repository with large media files.

## 4. Video Assets
Currently, the gallery supports images. For video:
1.  Upload video to YouTube/Vimeo.
2.  We will need to update the `gallery-loader.js` to handle video URLs if you wish to display efficient video embeds.
