# Downloads Folder

This folder contains the downloadable zip file for subscribed users.

## File Location

Place your `jarvis4everyone.zip` file in this folder.

The file path is configured in `.env` as:
```
DOWNLOAD_FILE_PATH=./.downloads/jarvis4everyone.zip
```

## Important Notes

1. **File Name**: The zip file should be named `jarvis4everyone.zip`
2. **File Size**: Consider file size limits for your hosting platform
3. **Security**: This folder should NOT be publicly accessible via direct URL
4. **Git**: This folder is typically ignored in `.gitignore` (do not commit large files)

## For Render Deployment

1. Upload the zip file to this folder
2. The file will be included in the Docker build
3. Ensure the file exists before deploying
4. For large files, consider using cloud storage (S3, etc.) instead
