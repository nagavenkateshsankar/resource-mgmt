package services

import (
	"encoding/json"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"log"
	"resource-mgmt/models"
)

type TemplateSeeder struct {
	db *gorm.DB
}

func NewTemplateSeeder(db *gorm.DB) *TemplateSeeder {
	return &TemplateSeeder{db: db}
}

// Helper function to convert map to datatypes.JSON
func (ts *TemplateSeeder) mapToJSON(data map[string]interface{}) datatypes.JSON {
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshaling data to JSON: %v", err)
		return datatypes.JSON{}
	}
	return datatypes.JSON(jsonBytes)
}

func (ts *TemplateSeeder) SeedDefaultTemplates() error {
	// This function should not be used - use SeedTemplatesForOrganization directly
	// with the specific organization ID when needed
	log.Println("Warning: SeedDefaultTemplates called - use SeedTemplatesForOrganization instead")
	return nil
}

// SeedTemplatesForOrganization creates default templates for a specific organization
func (ts *TemplateSeeder) SeedTemplatesForOrganization(organizationID string) error {
	// Check if default templates already exist for this organization
	// Only check for system-created templates, not user-created ones
	var count int64
	ts.db.Model(&models.Template{}).Where("organization_id = ? AND created_by LIKE '%system%'", organizationID).Count(&count)

	if count > 0 {
		log.Printf("Default templates already exist for organization %s (%d found)", organizationID, count)
		return nil
	}

	log.Printf("Creating default templates for organization: %s", organizationID)

	// First, ensure system user exists or create one with the organization
	systemUserID, err := ts.ensureSystemUser(organizationID)
	if err != nil {
		log.Printf("Failed to create/find system user: %v", err)
		// Continue with "system" string as fallback
		systemUserID = "system"
	}

	templates := ts.getDefaultTemplates(systemUserID, organizationID)

	for _, template := range templates {
		if err := ts.db.Create(&template).Error; err != nil {
			log.Printf("Error creating template %s for org %s: %v", template.Name, organizationID, err)
			return err
		}
		log.Printf("Created default template: %s for organization: %s", template.Name, organizationID)
	}

	log.Printf("Successfully created %d default templates for organization: %s", len(templates), organizationID)
	return nil
}

// Ensure system user exists
func (ts *TemplateSeeder) ensureSystemUser(organizationID string) (string, error) {
	var user models.GlobalUser

	// Try to find existing system user
	if err := ts.db.Where("email = ?", "system@internal").First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create system user
			user = models.GlobalUser{
				Name:  "System",
				Email: "system@internal",
			}

			if createErr := ts.db.Create(&user).Error; createErr != nil {
				return "", createErr
			}

			// Create organization membership for system user
			membership := &models.OrganizationMember{
				UserID:         user.ID,
				OrganizationID: organizationID,
				Role:           "admin",
				IsOrgAdmin:     true,
				IsPrimary:      false,
				Status:         "active",
			}
			if createErr := ts.db.Create(membership).Error; createErr != nil {
				log.Printf("Warning: Failed to create system user membership: %v", createErr)
			}

			log.Printf("Created system user with ID: %s", user.ID)
		} else {
			return "", err
		}
	}

	return user.ID, nil
}

func (ts *TemplateSeeder) getDefaultTemplates(systemUserID string, organizationID string) []models.Template {
	// Template 1: General Safety Inspection
	safetySchema := map[string]interface{}{
		"sections": []map[string]interface{}{
			{
				"name":        "Site Information",
				"description": "Basic site details and conditions",
				"fields": []map[string]interface{}{
					{
						"name":        "weather_condition",
						"label":       "Weather Condition",
						"type":        "select",
						"required":    true,
						"options":     []string{"Sunny", "Cloudy", "Rainy", "Windy", "Foggy", "Snow"},
						"description": "Current weather conditions",
					},
					{
						"name":        "temperature",
						"label":       "Temperature (°C)",
						"type":        "number",
						"placeholder": "Enter temperature",
						"description": "Ambient temperature reading",
					},
					{
						"name":        "site_access",
						"label":       "Site Access Requirements",
						"type":        "checkbox",
						"options":     []string{"Hard Hat Required", "Safety Vest Required", "Steel-toe Boots", "Safety Glasses", "Authorized Personnel Only"},
						"description": "Required PPE and access restrictions",
					},
				},
			},
			{
				"name":        "Safety Assessment",
				"description": "General safety evaluation and hazard identification",
				"fields": []map[string]interface{}{
					{
						"name":     "overall_safety_rating",
						"label":    "Overall Safety Rating",
						"type":     "radio",
						"required": true,
						"options":  []string{"Excellent", "Good", "Fair", "Poor", "Unsafe"},
					},
					{
						"name":    "hazards_present",
						"label":   "Hazards Identified",
						"type":    "checkbox",
						"options": []string{"Slip/Trip/Fall Risk", "Chemical Exposure", "Electrical Hazards", "Moving Machinery", "Height Work", "Confined Space", "None Identified"},
					},
					{
						"name":        "emergency_equipment",
						"label":       "Emergency Equipment Status",
						"type":        "checkbox",
						"options":     []string{"First Aid Kit Available", "Fire Extinguisher Present", "Emergency Exits Clear", "Eyewash Station Accessible", "Emergency Contact Posted"},
						"description": "Check all emergency equipment that is present and accessible",
					},
					{
						"name":        "safety_recommendations",
						"label":       "Safety Recommendations",
						"type":        "textarea",
						"placeholder": "Describe any safety concerns and recommended actions...",
						"rows":        4,
					},
				},
			},
		},
	}

	// Template 2: Equipment Inspection
	equipmentSchema := map[string]interface{}{
		"sections": []map[string]interface{}{
			{
				"name":        "Equipment Details",
				"description": "Equipment identification and basic information",
				"fields": []map[string]interface{}{
					{
						"name":        "equipment_type",
						"label":       "Equipment Type",
						"type":        "select",
						"required":    true,
						"options":     []string{"Heavy Machinery", "Power Tools", "Safety Equipment", "Vehicle", "HVAC", "Electrical", "Other"},
						"description": "Category of equipment being inspected",
					},
					{
						"name":        "equipment_id",
						"label":       "Equipment ID/Serial Number",
						"type":        "text",
						"required":    true,
						"placeholder": "Enter equipment identifier",
					},
					{
						"name":        "manufacturer",
						"label":       "Manufacturer",
						"type":        "text",
						"placeholder": "Equipment manufacturer",
					},
					{
						"name":        "last_service_date",
						"label":       "Last Service Date",
						"type":        "date",
						"description": "Date of last maintenance service",
					},
				},
			},
			{
				"name":        "Functional Assessment",
				"description": "Equipment performance and condition evaluation",
				"fields": []map[string]interface{}{
					{
						"name":     "operational_status",
						"label":    "Operational Status",
						"type":     "radio",
						"required": true,
						"options":  []string{"Fully Operational", "Minor Issues", "Major Issues", "Out of Service"},
					},
					{
						"name":    "inspection_checklist",
						"label":   "Inspection Checklist",
						"type":    "checkbox",
						"options": []string{"Visual inspection complete", "Moving parts lubricated", "Safety guards in place", "Controls functioning", "No unusual noise/vibration", "Electrical connections secure"},
					},
					{
						"name":        "performance_rating",
						"label":       "Performance Rating (1-10)",
						"type":        "number",
						"min":         1,
						"max":         10,
						"description": "Rate overall equipment performance",
					},
					{
						"name":        "maintenance_notes",
						"label":       "Maintenance Notes",
						"type":        "textarea",
						"placeholder": "Document any maintenance needs or recommendations...",
						"rows":        4,
					},
				},
			},
		},
	}

	// Template 3: Compliance Audit
	complianceSchema := map[string]interface{}{
		"sections": []map[string]interface{}{
			{
				"name":        "Compliance Overview",
				"description": "General compliance assessment information",
				"fields": []map[string]interface{}{
					{
						"name":        "audit_type",
						"label":       "Audit Type",
						"type":        "select",
						"required":    true,
						"options":     []string{"OSHA Compliance", "Environmental", "Quality Standards", "Building Codes", "Industry Specific", "Internal Policy"},
						"description": "Type of compliance being audited",
					},
					{
						"name":        "applicable_standards",
						"label":       "Applicable Standards",
						"type":        "checkbox",
						"options":     []string{"OSHA 1926", "ISO 9001", "ISO 14001", "Local Building Codes", "Company Policy", "Industry Standards"},
						"description": "Select all applicable standards and regulations",
					},
					{
						"name":        "audit_scope",
						"label":       "Audit Scope",
						"type":        "textarea",
						"placeholder": "Describe the scope and areas covered by this audit...",
						"rows":        3,
					},
				},
			},
			{
				"name":        "Compliance Assessment",
				"description": "Detailed compliance evaluation",
				"fields": []map[string]interface{}{
					{
						"name":     "overall_compliance",
						"label":    "Overall Compliance Status",
						"type":     "radio",
						"required": true,
						"options":  []string{"Fully Compliant", "Minor Non-Compliance", "Major Non-Compliance", "Critical Violations"},
					},
					{
						"name":    "compliance_areas",
						"label":   "Compliance Areas Checked",
						"type":    "checkbox",
						"options": []string{"Documentation", "Training Records", "Safety Procedures", "Equipment Certifications", "Environmental Controls", "Permits and Licenses"},
					},
					{
						"name":        "violations_found",
						"label":       "Violations/Non-Compliance Found",
						"type":        "textarea",
						"placeholder": "Detail any violations or non-compliance issues identified...",
						"rows":        4,
					},
					{
						"name":        "corrective_actions",
						"label":       "Required Corrective Actions",
						"type":        "textarea",
						"placeholder": "List required actions to achieve compliance...",
						"rows":        4,
					},
				},
			},
		},
	}

	// Template 4: Site Maintenance Review
	maintenanceSchema := map[string]interface{}{
		"sections": []map[string]interface{}{
			{
				"name":        "Facility Overview",
				"description": "Basic facility information and scope",
				"fields": []map[string]interface{}{
					{
						"name":        "facility_type",
						"label":       "Facility Type",
						"type":        "select",
						"required":    true,
						"options":     []string{"Office Building", "Warehouse", "Manufacturing", "Retail", "Industrial", "Residential", "Other"},
						"description": "Type of facility being inspected",
					},
					{
						"name":        "building_age",
						"label":       "Building Age (years)",
						"type":        "number",
						"placeholder": "Approximate age of building",
					},
					{
						"name":        "square_footage",
						"label":       "Square Footage",
						"type":        "number",
						"placeholder": "Total facility area",
					},
				},
			},
			{
				"name":        "Maintenance Assessment",
				"description": "Detailed maintenance condition review",
				"fields": []map[string]interface{}{
					{
						"name":    "systems_checked",
						"label":   "Systems Inspected",
						"type":    "checkbox",
						"options": []string{"HVAC System", "Electrical System", "Plumbing", "Fire Safety", "Security System", "Lighting", "Flooring", "Roof/Structure"},
					},
					{
						"name":     "overall_condition",
						"label":    "Overall Facility Condition",
						"type":     "radio",
						"required": true,
						"options":  []string{"Excellent", "Good", "Fair", "Poor", "Critical"},
					},
					{
						"name":    "maintenance_priorities",
						"label":   "Maintenance Priorities",
						"type":    "checkbox",
						"options": []string{"Immediate Repair Needed", "Scheduled Maintenance Due", "Preventive Maintenance", "Cosmetic Improvements", "Safety Upgrades", "No Action Required"},
					},
					{
						"name":        "maintenance_recommendations",
						"label":       "Maintenance Recommendations",
						"type":        "textarea",
						"placeholder": "Detail recommended maintenance actions and timeline...",
						"rows":        4,
					},
					{
						"name":        "estimated_cost",
						"label":       "Estimated Maintenance Cost",
						"type":        "select",
						"options":     []string{"Under $500", "$500 - $2,000", "$2,000 - $10,000", "$10,000 - $50,000", "Over $50,000"},
						"description": "Rough estimate for recommended maintenance",
					},
				},
			},
		},
	}

	return []models.Template{
		{
			OrganizationID: organizationID,
			Name:           "General Safety Inspection",
			Description:    "Comprehensive safety inspection for construction sites and facilities",
			Category:       "Safety",
			CreatedBy:      systemUserID,
			IsActive:       true,
			FieldsSchema:   ts.mapToJSON(safetySchema),
		},
		{
			OrganizationID: organizationID,
			Name:           "Equipment Inspection",
			Description:    "Routine equipment functionality and maintenance check",
			Category:       "Equipment",
			CreatedBy:      systemUserID,
			IsActive:       true,
			FieldsSchema:   ts.mapToJSON(equipmentSchema),
		},
		{
			OrganizationID: organizationID,
			Name:           "Compliance Audit",
			Description:    "Regulatory compliance and standards verification",
			Category:       "Compliance",
			CreatedBy:      systemUserID,
			IsActive:       true,
			FieldsSchema:   ts.mapToJSON(complianceSchema),
		},
		{
			OrganizationID: organizationID,
			Name:           "Site Maintenance Review",
			Description:    "Regular maintenance assessment for facilities and infrastructure",
			Category:       "Maintenance",
			CreatedBy:      systemUserID,
			IsActive:       true,
			FieldsSchema:   ts.mapToJSON(maintenanceSchema),
		},
	}
}
