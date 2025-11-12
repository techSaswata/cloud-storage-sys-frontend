# Office Logos Directory

This directory contains the Microsoft Office application logos used in the filter buttons.

## Required Images

Please add the following image files to this directory:

### 1. **word.png**

- Microsoft Word logo
- Recommended size: 64x64px or 128x128px
- Format: PNG with transparent background
- Color: Blue (#2B65D9)

### 2. **excel.png**

- Microsoft Excel logo
- Recommended size: 64x64px or 128x128px
- Format: PNG with transparent background
- Color: Green (#217346)

### 3. **powerpoint.png**

- Microsoft PowerPoint logo
- Recommended size: 64x64px or 128x128px
- Format: PNG with transparent background
- Color: Orange/Red (#B7472A)

### 4. **onenote.png**

- Microsoft OneNote logo
- Recommended size: 64x64px or 128x128px
- Format: PNG with transparent background
- Color: Purple (#7719AA)

## Where to Get Logos

You can download official Microsoft Office logos from:

1. **Microsoft Official Brand Assets**

   - https://www.microsoft.com/en-us/download/details.aspx?id=35825

2. **Icon Libraries**

   - https://icons8.com (search for "Microsoft Word", "Excel", etc.)
   - https://www.flaticon.com (search for "Microsoft Office")

3. **Free Icon Resources**
   - https://www.iconfinder.com
   - https://iconscout.com

## Image Specifications

- **Width**: 16px display size (will scale from higher resolution)
- **Height**: 16px display size (will scale from higher resolution)
- **Format**: PNG with transparency
- **Quality**: High resolution (64x64px or 128x128px) for crisp display on retina screens
- **Background**: Transparent

## File Structure

```
public/
  images/
    office-logos/
      word.png       ← Place Microsoft Word logo here
      excel.png      ← Place Microsoft Excel logo here
      powerpoint.png ← Place Microsoft PowerPoint logo here
      onenote.png    ← Place Microsoft OneNote logo here
      README.md      ← This file
```

## Usage in Code

The logos are used in the filter buttons at `app/home/page.tsx`:

```tsx
<img
  src="/images/office-logos/word.png"
  alt="Word"
  className="w-4 h-4 object-contain"
/>
```

## Alternative: Use Placeholder Until You Add Real Logos

If you don't have the logos yet, the buttons will show broken image icons. You can:

1. **Download from URLs** (temporary placeholders):

   ```bash
   # Run these commands in PowerShell from the project root
   curl -o "public\images\office-logos\word.png" "https://img.icons8.com/color/48/microsoft-word-2019.png"
   curl -o "public\images\office-logos\excel.png" "https://img.icons8.com/color/48/microsoft-excel-2019.png"
   curl -o "public\images\office-logos\powerpoint.png" "https://img.icons8.com/color/48/microsoft-powerpoint-2019.png"
   curl -o "public\images\office-logos\onenote.png" "https://img.icons8.com/color/48/onenote.png"
   ```

2. **Or manually save** the logos from any of the sources listed above.

## Notes

- The images should be square (1:1 aspect ratio)
- Use PNG format for best quality with transparency
- Make sure the logos are recognizable at 16x16px display size
- Official Microsoft logos are preferred for authenticity
