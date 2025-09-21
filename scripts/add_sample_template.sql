-- Add a sample template to the database
INSERT INTO templates (name, description, category, fields_schema, is_active, created_by, created_at, updated_at) 
VALUES (
  'Basic Site Inspection',
  'A simple template for basic site safety inspections',
  'Safety',
  '{
    "sections": [
      {
        "name": "Site Information",
        "description": "Basic details about the inspection site",
        "fields": [
          {
            "name": "weather_condition",
            "label": "Weather Condition",
            "type": "select",
            "required": true,
            "options": ["Sunny", "Cloudy", "Rainy", "Windy", "Foggy"]
          },
          {
            "name": "temperature",
            "label": "Temperature (°C)",
            "type": "number",
            "placeholder": "Enter temperature"
          },
          {
            "name": "access_restrictions",
            "label": "Access Restrictions",
            "type": "checkbox",
            "options": ["Hard Hat Required", "Safety Vest Required", "Authorized Personnel Only", "No Restrictions"]
          }
        ]
      },
      {
        "name": "Safety Assessment",
        "description": "General safety evaluation",
        "fields": [
          {
            "name": "overall_safety",
            "label": "Overall Safety Rating",
            "type": "radio",
            "required": true,
            "options": ["Excellent", "Good", "Fair", "Poor", "Unsafe"]
          },
          {
            "name": "hazards_identified",
            "label": "Hazards Identified",
            "type": "checkbox",
            "options": ["Slip/Trip/Fall", "Chemical Exposure", "Electrical", "Moving Machinery", "None"]
          },
          {
            "name": "recommendations",
            "label": "Recommendations",
            "type": "textarea",
            "placeholder": "Enter your recommendations...",
            "rows": 4
          },
          {
            "name": "inspection_photo",
            "label": "Site Photo",
            "type": "file",
            "accept": "image/*",
            "help": "Take a photo of the inspection site"
          }
        ]
      }
    ]
  }',
  true,
  'demo-user-1',
  NOW(),
  NOW()
);