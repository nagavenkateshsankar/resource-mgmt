# Site Inspection Manager - User Guide

## 🚀 Getting Started

### 1. Login
- Navigate to `http://localhost:5432`
- Use demo credentials:
  - **Email**: admin@resourcemgmt.com  
  - **Password**: password123

### 2. First Time Setup
The app needs templates before you can create inspections. Here's how to set it up:

## 📝 Creating Your First Template

### Step 1: Navigate to Templates
1. Click on **"Templates"** in the left sidebar
2. You'll see an empty templates list
3. Click **"+ New Template"** button

### Step 2: Build Your Template
1. **Template Information**:
   - **Name**: Enter a descriptive name (e.g., "Building Safety Inspection")
   - **Category**: Enter a category (e.g., "Safety", "Maintenance") 
   - **Description**: Add details about when to use this template

2. **Add Sections**:
   - Click **"+ Add Section"**
   - Enter section name (e.g., "General Information")
   - Add optional description

3. **Add Fields to Sections**:
   - Click **"+ Add Field"** within a section
   - Fill out the field form:
     - **Field Name**: Technical name (e.g., `weather_condition`)
     - **Field Label**: Display name (e.g., "Weather Condition")
     - **Field Type**: Choose from:
       - `text` - Single line text
       - `textarea` - Multi-line text  
       - `number` - Numeric input
       - `email` - Email address
       - `phone` - Phone number
       - `date` - Date picker
       - `time` - Time picker
       - `datetime` - Date and time
       - `select` - Dropdown list
       - `radio` - Single choice
       - `checkbox` - Multiple choices
       - `file` - File upload
     - **Options**: For select/radio/checkbox, add options (one per line)
     - **Required**: Check if field is mandatory
     - **Placeholder/Help**: Optional guidance text

4. **Preview & Save**:
   - Click **"👁️ Preview"** to test your template
   - Click **"💾 Save Template"** to save

## 🔍 Creating Inspections

### Method 1: From Dashboard
1. Go to **Dashboard**
2. Click **"+ New Inspection"**
3. Select a template from the modal
4. Fill out the form
5. Click **"📤 Submit"** when done

### Method 2: From Templates Page
1. Go to **Templates**
2. Find the template you want to use
3. Click **"Use Template"**
4. Fill out the inspection form
5. Submit when complete

### Method 3: Quick Access
- Use the **blue "+" button** (floating action button) in the bottom right
- This always creates a new inspection

## 📊 Managing Inspections

### Viewing Inspections
1. Click **"Inspections"** in sidebar
2. See all your inspections with status indicators:
   - **Draft**: Not yet started
   - **In Progress**: Currently being worked on  
   - **Completed**: Finished inspections

### Filtering Inspections
1. Click **"🔍 Filter"** button
2. Filter by:
   - Status (Draft, In Progress, Completed)
   - Priority (Low, Medium, High)
3. Click **"Apply"** to filter

### Inspection Workflow
- **Draft** → **In Progress** → **Completed**
- Inspections auto-save as you work
- Can resume draft inspections anytime

## 🔧 Template Management

### Edit Existing Templates
1. Go to **Templates** page
2. Click **"✏️ Edit"** on any template
3. Modify sections and fields
4. Save changes

### Duplicate Templates  
1. Click **"📄 Duplicate"** on any template
2. Creates a copy with " (Copy)" suffix
3. Edit the duplicate as needed

### Template Categories
- Organize templates by category
- Categories appear in template lists
- Helps with organization and filtering

## 📱 Mobile Usage

The app is fully responsive and works on mobile devices:
- **Hamburger Menu**: Tap arrow to collapse sidebar
- **Touch Friendly**: All buttons sized for touch
- **PWA Support**: Can be installed on mobile home screen

## 🚨 Important Notes

### Before You Start:
1. **Always create templates first** - You can't create inspections without templates
2. **Test templates** - Use the preview feature to verify your forms work correctly
3. **Plan your fields** - Think about what data you need to collect

### Data Flow:
```
Create Template → Use Template → Fill Form → Submit Inspection → View Results
```

### Common Issues:
- **"No templates available"**: Create a template first
- **Empty form page**: Template may be corrupted, check template structure
- **Login issues**: Check database connection and user credentials

## 🎯 Quick Start Template

Here's a simple template to get you started:

**Template Name**: "Basic Site Check"
**Category**: "General"

**Section 1**: "Site Details"
- Field: `site_condition` (Radio) - Options: Good, Fair, Needs Attention
- Field: `weather` (Select) - Options: Sunny, Cloudy, Rainy
- Field: `notes` (Textarea) - General observations

**Section 2**: "Safety"  
- Field: `safety_hazards` (Checkbox) - Options: None, Wet Surfaces, Obstacles, Electrical
- Field: `overall_rating` (Radio) - Options: Safe, Caution, Unsafe

This gives you a working template to start with!

## 🔄 Workflow Example

1. **Morning**: Create "Daily Safety Check" template
2. **During Inspections**: Use template to create inspections at different sites
3. **End of Day**: Review completed inspections in dashboard
4. **Weekly**: Check overdue inspections and follow up

## 💡 Pro Tips

- **Use descriptive field names** - Makes data analysis easier later
- **Add help text** - Guides inspectors on what to look for
- **Group related fields** - Use sections to organize logically
- **Test on mobile** - Many inspections happen in the field
- **Regular backups** - Export important inspection data

---

Need help? Check the browser console (F12) for error messages, or review the network tab to see API requests.