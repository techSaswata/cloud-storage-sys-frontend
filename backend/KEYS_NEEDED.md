# Required API Keys and Credentials

This document provides **step-by-step instructions** for obtaining all the API keys and credentials needed for the Cloud Media Storage System.

---

## 🔑 Overview - What You Need

1. ✅ **Supabase S3 Storage** - For storing binary files (media, documents, code, etc.)
2. ✅ **Supabase SQL (PostgreSQL)** - For storing structured tabular data (optional but recommended)
3. ✅ **MongoDB** - For storing metadata and unstructured data (local or MongoDB Atlas)
4. ✅ **Pinecone** - For vector embeddings and semantic search

---

## 1. 🗄️ Supabase S3 Storage Setup

Supabase provides S3-compatible object storage for your media files.

### Step 1: Create a Supabase Account

1. Go to **https://supabase.com**
2. Click **"Start your project"** or **"Sign in"**
3. Sign up with **GitHub**, **Google**, or **Email**
4. Verify your email if required

### Step 2: Create a New Project

1. After logging in, you'll see the **Supabase Dashboard**
2. Click **"New Project"** button (green button)
3. Fill in the project details:
   - **Organization**: Select or create one
   - **Name**: Give your project a name (e.g., "media-storage")
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you (e.g., "US East")
   - **Pricing Plan**: Select **"Free"** (includes 1GB storage)
4. Click **"Create new project"**
5. Wait 1-2 minutes for project to be created

### Step 3: Get Your Project ID

1. Once your project is created, look at the URL in your browser:
   - URL format: `https://supabase.com/dashboard/project/xxxxxxxxxxxxx`
   - The `xxxxxxxxxxxxx` part is your **Project ID**
2. **Copy this Project ID** - you'll need it for `.env`

### Step 4: Create a Storage Bucket

1. In your Supabase project, click **"Storage"** in the left sidebar
2. Click **"Create a new bucket"** or **"New bucket"**
3. Fill in bucket details:
   - **Name**: `media-files` (or your preferred name)
   - **Public bucket**: ✅ Check this if you want public URLs
   - **File size limit**: Leave default or set to 500MB
   - **Allowed MIME types**: Leave empty (allows all)
4. Click **"Create bucket"**
5. **Save the bucket name** - you'll need it as `SUPABASE_S3_BUCKET`

### Step 5: Generate S3 Access Keys

1. In the left sidebar, click **"Project Settings"** (gear icon at bottom)
2. Click **"API"** in the settings menu
3. Scroll down to **"S3 Access Keys"** section
4. Click **"Generate new key"** or **"Create S3 credentials"**
5. You'll see:
   - **Access Key ID**: Starts with something like `xxxxxxxxxxxxxxxxxxxxx`
   - **Secret Access Key**: A long secret key (only shown once!)
6. **IMPORTANT**: Copy both keys immediately and save them securely
   - ⚠️ The secret key is only shown once - you can't retrieve it later!

### Step 6: Get S3 Endpoint URL

Your Supabase S3 endpoint follows this format:
```
https://[PROJECT_ID].supabase.co/storage/v1/s3
```

Replace `[PROJECT_ID]` with your actual project ID from Step 3.

### Step 7: Fill in .env File

Add these to your `.env` file:

```env
SUPABASE_PROJECT_ID=your_project_id_from_step3
SUPABASE_S3_ACCESS_KEY=your_access_key_from_step5
SUPABASE_S3_SECRET_KEY=your_secret_key_from_step5
SUPABASE_S3_REGION=us-east-1
SUPABASE_S3_BUCKET=media-files
SUPABASE_S3_ENDPOINT=https://your_project_id.supabase.co/storage/v1/s3
```

### ✅ Verify Supabase Setup

Test if your credentials work:
```bash
python3 storage_s3.py upload test.jpg
```

---

## 2. 🗄️ Supabase SQL (PostgreSQL) Setup

Supabase provides a PostgreSQL database for storing structured tabular data. This is **optional** but recommended for the Structured Data Pipeline.

### Overview

The Structured Data Pipeline uses Supabase SQL to store tabular data (CSV files, uniform JSON arrays) for efficient querying. If Supabase SQL is not configured, the system automatically falls back to MongoDB.

### Step 1: Get Supabase Project URL and API Key

If you already created a Supabase project in Section 1, use that same project:

1. Go to your Supabase Dashboard: **https://supabase.com/dashboard**
2. Select your project
3. Click **"Project Settings"** (gear icon at bottom left)
4. Click **"API"** in the settings menu
5. You'll see two important values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public** key: A long JWT token starting with `eyJ...`
6. **Copy both values** - you'll need them for `.env`

### Step 2: Create Database Table for Structured Data

You need to create a table to store structured data rows. You can do this via the Supabase SQL Editor:

1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Paste the following SQL code:

```sql
-- Create table for structured data storage
CREATE TABLE IF NOT EXISTS structured_data (
    id BIGSERIAL PRIMARY KEY,
    file_id VARCHAR(255) NOT NULL,
    row_index INTEGER NOT NULL,
    row_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_file_row UNIQUE(file_id, row_index)
);

-- Create indexes for better query performance
CREATE INDEX idx_structured_data_file_id ON structured_data(file_id);
CREATE INDEX idx_structured_data_created_at ON structured_data(created_at DESC);
CREATE INDEX idx_structured_data_row_data ON structured_data USING GIN(row_data);

-- Add comment to table
COMMENT ON TABLE structured_data IS 'Stores structured tabular data (CSV, uniform JSON arrays)';
```

4. Click **"Run"** (or press Ctrl+Enter)
5. You should see: `Success. No rows returned`

### Step 3: Verify Table Creation

1. In the left sidebar, click **"Table Editor"**
2. You should see `structured_data` in the list of tables
3. Click on it to view the schema

### Step 4: Fill in .env File

Add these to your `.env` file:

```env
# ===== SUPABASE SQL (PostgreSQL) =====
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz... (your anon key)
```

**Note**: These are different from the S3 credentials. The system uses:
- `SUPABASE_URL` + `SUPABASE_KEY` for SQL database access
- `SUPABASE_S3_*` credentials for object storage

### Step 5: Update Config (if needed)

Add these variables to your `config.py` if they're not already there:

```python
# Supabase SQL (PostgreSQL)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
```

### ✅ Verify Supabase SQL Setup

Test if your SQL connection works:

```bash
python3 structured_data_pipeline.py test_data.csv
```

### SQL Table Schema Explanation

**structured_data** table stores rows from tabular files:

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Auto-incrementing primary key |
| `file_id` | VARCHAR(255) | UUID of the uploaded file |
| `row_index` | INTEGER | Index of the row in the original file (0-based) |
| `row_data` | JSONB | The actual row data stored as JSON |
| `created_at` | TIMESTAMP | Timestamp when the row was inserted |

**Why JSONB?**
- Flexible schema - each file can have different columns
- Efficient indexing with GIN indexes
- Native JSON query support in PostgreSQL
- Can query specific fields within row_data

**Example queries:**

```sql
-- Get all rows for a specific file
SELECT * FROM structured_data WHERE file_id = 'abc-123-def';

-- Query specific field in JSON data
SELECT row_data->>'name' as name, row_data->>'age' as age
FROM structured_data
WHERE file_id = 'abc-123-def';

-- Filter by JSON field value
SELECT * FROM structured_data
WHERE row_data->>'status' = 'active';

-- Count rows per file
SELECT file_id, COUNT(*) as row_count
FROM structured_data
GROUP BY file_id;
```

### 🔄 Fallback Behavior

If Supabase SQL is not configured:
- The system automatically detects this
- Structured data is stored in MongoDB instead
- No errors or data loss - just uses NoSQL storage
- You can add Supabase SQL later without migrating data

### ⚠️ Important Notes

1. **Free Tier Limits**: Supabase free tier includes:
   - 500MB database storage
   - Unlimited API requests
   - Good for testing and small projects

2. **Storage Decision**: The system automatically decides:
   - **Tabular data (CSV, uniform JSON)** → Supabase SQL (if available) → MongoDB (fallback)
   - **Nested/irregular data (XML, nested JSON)** → MongoDB (always)

3. **Data Relationships**: Each file's metadata is stored in MongoDB with a reference to Supabase SQL rows if applicable

---

## 3. 🍃 MongoDB Setup (Choose One Option)

MongoDB stores metadata about your media files. Choose either **Local** (for development) or **Atlas** (for production/cloud).

---

### **Option A: Local MongoDB (Easiest for Development)**

Perfect for testing and development on your own computer.

#### For macOS:

1. Install Homebrew (if not installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Install MongoDB:
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```

3. Start MongoDB:
   ```bash
   brew services start mongodb-community
   ```

4. Verify it's running:
   ```bash
   mongosh
   ```
   If you see the MongoDB shell, it's working! Type `exit` to quit.

#### For Ubuntu/Debian Linux:

1. Import MongoDB public key:
   ```bash
   curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
   ```

2. Add MongoDB repository:
   ```bash
   echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   ```

3. Install MongoDB:
   ```bash
   sudo apt update
   sudo apt install -y mongodb-org
   ```

4. Start MongoDB:
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

5. Verify:
   ```bash
   mongosh
   ```

#### For Windows:

1. Download MongoDB Community Server from:
   **https://www.mongodb.com/try/download/community**

2. Run the installer (.msi file)
   - Choose "Complete" installation
   - Install MongoDB as a Service ✅
   - Install MongoDB Compass (GUI) ✅

3. MongoDB should start automatically

4. Verify by opening MongoDB Compass application

#### Fill in .env File (Local MongoDB):

```env
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DATABASE=media_storage
```

---

### **Option B: MongoDB Atlas (Cloud/Production)**

Free tier includes 512MB storage (perfect for getting started).

#### Step 1: Create MongoDB Atlas Account

1. Go to **https://www.mongodb.com/cloud/atlas**
2. Click **"Try Free"** or **"Sign Up"**
3. Sign up with **Google**, **GitHub**, or **Email**
4. Verify your email

#### Step 2: Create a Free Cluster

1. After logging in, you'll be prompted to create a cluster
2. Choose **"Deploy a database"** → **"M0 FREE"**
3. Select settings:
   - **Provider**: AWS (recommended)
   - **Region**: Choose closest to you (e.g., "US-EAST-1")
   - **Cluster Name**: Leave as "Cluster0" or rename
4. Click **"Create"** (bottom right)
5. Wait 1-3 minutes for cluster to be created

#### Step 3: Create Database User

1. You'll see a popup: **"Security Quickstart"**
2. Under **"Authentication"**:
   - **Username**: Create a username (e.g., `mediauser`)
   - **Password**: Create a strong password
   - ⚠️ **SAVE THESE CREDENTIALS** - you'll need them!
3. Click **"Create User"**

#### Step 4: Whitelist IP Address

1. Still in the popup, under **"Where would you like to connect from?"**
2. Choose **"My Local Environment"**
3. Click **"Add My Current IP Address"**
   - Or click **"Add IP Address"** and enter `0.0.0.0/0` to allow all IPs (for development only!)
4. Click **"Finish and Close"**

#### Step 5: Get Connection String

1. Click **"Connect"** button on your cluster
2. Choose **"Connect your application"**
3. Select:
   - **Driver**: Python
   - **Version**: 3.12 or higher
4. Copy the connection string. It will look like one of these:
   ```
   # Example 1 (newer format):
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?appName=Cluster0
   
   # Example 2 (older format):
   mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **IMPORTANT**: 
   - If you see `<password>`, replace it with your actual password from Step 3
   - If password is already there, keep the string as-is
   - The part after `?` (query parameters) is optional - both formats work fine!
6. Replace `username` if it shows as a placeholder

**Note**: The parameters after `?` are optional settings:
- `appName=Cluster0` - Identifies your app in Atlas (for monitoring)
- `retryWrites=true` - Auto-retry failed writes
- `w=majority` - Write confirmation from majority of nodes

**Your connection string from MongoDB Atlas will work as-is!**

#### Step 6: Fill in .env File (MongoDB Atlas):

**Use your EXACT connection string from MongoDB Atlas!** It will look like:

```env
# Example - use YOUR actual string from Step 5
MONGODB_URI=mongodb+srv://accuwu381_db_user:MqAeSHFGLNffM4iv@cluster0.u93lwnn.mongodb.net/?appName=Cluster0
MONGODB_DATABASE=media_storage
```

**Important**:
- ✅ Copy the ENTIRE string from MongoDB Atlas
- ✅ Make sure password is already filled in (no `<password>` placeholder)
- ✅ Keep ALL parameters after `?` - they're all valid!
- ✅ Don't worry about differences in query parameters - both formats work fine

### ✅ Verify MongoDB Setup

Test connection:
```bash
python3 storage_db.py
```

---

## 4. 📍 Pinecone Setup

Pinecone stores vector embeddings for semantic search.

**⚠️ IMPORTANT**: You only need to get the API key - DON'T create any indexes manually! The system creates them automatically with correct settings.

### Step 1: Create Pinecone Account

1. Go to **https://www.pinecone.io**
2. Click **"Sign Up Free"** or **"Start Free"**
3. Sign up with **Google**, **GitHub**, or **Email**
4. Verify your email

### Step 2: Create a New Project

1. After logging in, you'll see the Pinecone Console
2. If prompted, create a new project:
   - **Project Name**: `media-search` (or your choice)
   - Click **"Create Project"**

### Step 3: Get API Key

1. In the Pinecone Console, look at the left sidebar
2. Click **"API Keys"** (or look in the top navigation)
3. You'll see your default API key
4. Click the **"Copy"** button or **eye icon** to reveal it
5. **Save this key** - looks like: `12345678-1234-1234-1234-123456789abc`

### Step 4: Get Environment Name

1. In the same **"API Keys"** section
2. Look for **"Environment"** field
3. It will show something like:
   - `us-east-1-aws`
   - `us-west-2-aws`
   - `gcp-starter`
4. **Copy this environment name**

### Step 5: Choose Index Name

1. **DON'T create an index manually on the website!**
2. The system will create it automatically on first run
3. Just choose a name for your index (e.g., `media-embeddings`)
4. This will be your `PINECONE_INDEX_NAME`

**Important**: The index is created automatically with the correct settings (dimensions, metric, etc.). Manual creation might use wrong settings!

### Step 6: Fill in .env File

```env
PINECONE_API_KEY=12345678-1234-1234-1234-123456789abc
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=media-embeddings
```

Replace with your actual values from above steps.

### ✅ Verify Pinecone Setup

Test connection (this will automatically create the index if needed):
```bash
python3 storage_pinecone.py test
```

**What you'll see on first run:**
```
Creating Pinecone index: media-embeddings
Waiting for index to be ready...
Index media-embeddings created successfully!
Connected to Pinecone index: media-embeddings
```

This is normal and expected! The index is being created with the correct settings automatically.

---

## 📝 Complete .env Example

Here's what your complete `.env` file should look like:

```env
# ===== SUPABASE S3 STORAGE =====
SUPABASE_PROJECT_ID=abcdefghijklmnopqrst
SUPABASE_S3_ACCESS_KEY=1234567890abcdefghij
SUPABASE_S3_SECRET_KEY=abcdefghijklmnopqrstuvwxyz1234567890ABCD
SUPABASE_S3_REGION=us-east-1
SUPABASE_S3_BUCKET=media-files
SUPABASE_S3_ENDPOINT=https://abcdefghijklmnopqrst.supabase.co/storage/v1/s3

# ===== SUPABASE SQL (PostgreSQL) - Optional =====
SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBh...

# ===== MONGODB =====
# Option A: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DATABASE=media_storage

# Option B: MongoDB Atlas (use instead of local)
# MONGODB_URI=mongodb+srv://mediauser:mypassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
# MONGODB_DATABASE=media_storage

# ===== PINECONE =====
PINECONE_API_KEY=12345678-1234-1234-1234-123456789abc
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=media-embeddings

# ===== OPTIONAL SETTINGS =====
UPLOAD_DIR=./uploads
COMPRESSED_DIR=./compressed
MAX_FILE_SIZE=500000000
IMAGE_QUALITY=85
VIDEO_CRF=23
CLIP_MODEL=ViT-B/32
```

---

## 🆓 Free Tier Summary

All services offer generous free tiers:

| Service | Free Tier | Perfect For |
|---------|-----------|-------------|
| **Supabase S3** | 1GB storage | Binary file storage (media, docs, code) |
| **Supabase SQL** | 500MB database | Structured/tabular data (CSV, uniform JSON) |
| **MongoDB Atlas** | 512MB storage | Metadata & unstructured data |
| **MongoDB Local** | Unlimited (your disk) | Local development |
| **Pinecone** | 1 index, 100K vectors | Semantic search for all file types |

---

## ✅ Verification Checklist

After setting up all credentials, verify everything works:

1. **Copy and edit .env**:
   ```bash
   cp env.example .env
   # Edit .env with your credentials
   ```

2. **Run setup validator**:
   ```bash
   python setup.py
   ```

3. **You should see**:
   ```
   ✓ S3 connection successful
   ✓ Database connection successful (MongoDB)
   ✓ Pinecone connection successful
   ```

---

## 🔒 Security Best Practices

1. ✅ **Never commit .env to git** (already in .gitignore)
2. ✅ **Keep API keys secret** - treat them like passwords
3. ✅ **Use different credentials** for dev/staging/production
4. ✅ **Rotate keys regularly** (every 90 days recommended)
5. ✅ **Use environment variables** in production (not .env files)
6. ✅ **Restrict Supabase bucket** permissions if handling sensitive data
7. ✅ **Whitelist specific IPs** in MongoDB Atlas for production

---

## ❓ Troubleshooting

### Supabase Issues

**Problem**: "Access Denied" errors
- ✅ Verify S3 credentials are correct
- ✅ Check bucket name matches exactly
- ✅ Ensure endpoint URL is correct

**Problem**: "Bucket not found"
- ✅ Create the bucket in Supabase Dashboard → Storage
- ✅ Check bucket name spelling in .env

### MongoDB Issues

**Problem**: "Connection refused" (Local MongoDB)
- ✅ Check if MongoDB is running: `brew services list` (macOS) or `sudo systemctl status mongod` (Linux)
- ✅ Start MongoDB if stopped

**Problem**: "Authentication failed" (MongoDB Atlas)
- ✅ Check username and password are correct in the connection string
- ✅ Ensure there are no `<` or `>` brackets around password
- ✅ Check if IP is whitelisted in Atlas (Network Access section)
- ✅ Verify you're using the EXACT string from MongoDB Atlas dashboard

### Pinecone Issues

**Problem**: "Unauthorized" errors
- ✅ Verify API key is correct (no extra spaces)
- ✅ Check environment name matches your account

**Problem**: "Index not found"
- ✅ The index is created automatically on first run - this is normal!
- ✅ Wait 10-15 seconds for index creation to complete
- ✅ If you created an index manually, delete it and let the system create it

**Problem**: "Dimension mismatch"
- ✅ You probably created the index manually with wrong dimensions
- ✅ Delete the manual index from Pinecone dashboard
- ✅ Let the system create it automatically with correct dimensions

---

## 📞 Need Help?

If you're stuck:

1. **Re-check each step** carefully
2. **Copy error messages** and search online
3. **Check service status pages**:
   - Supabase: https://status.supabase.com
   - MongoDB Atlas: https://status.cloud.mongodb.com
   - Pinecone: https://status.pinecone.io

4. **Documentation**:
   - Supabase: https://supabase.com/docs
   - MongoDB: https://docs.mongodb.com
   - Pinecone: https://docs.pinecone.io

---

## 🎉 You're Ready!

Once you have all credentials in your `.env` file:

```bash
# Test everything
python setup.py

# Process your first file
python media_processor.py image.jpg

# Start the API
python api.py
```

**Congratulations! Your media storage system is ready to use!** 🚀
