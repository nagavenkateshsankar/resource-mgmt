package utils

// GetDefaultPermissions returns default permissions for a role
func GetDefaultPermissions(role string) map[string]interface{} {
	switch role {
	case "admin":
		return map[string]interface{}{
			"can_create_inspections":   true,
			"can_view_own_inspections": true,
			"can_view_all_inspections": true,
			"can_edit_inspections":     true,
			"can_delete_inspections":   true,
			"can_create_templates":     true,
			"can_edit_templates":       true,
			"can_delete_templates":     true,
			"can_manage_users":         true,
			"can_view_reports":         true,
			"can_export_reports":       true,
			"can_upload_files":         true,
			"can_manage_notifications": true,
		}
	case "supervisor":
		return map[string]interface{}{
			"can_create_inspections":   true,
			"can_view_own_inspections": true,
			"can_view_all_inspections": true,
			"can_edit_inspections":     true,
			"can_delete_inspections":   false,
			"can_create_templates":     true,
			"can_edit_templates":       true,
			"can_delete_templates":     false,
			"can_manage_users":         false,
			"can_view_reports":         true,
			"can_export_reports":       true,
			"can_upload_files":         true,
			"can_manage_notifications": false,
		}
	case "inspector":
		return map[string]interface{}{
			"can_create_inspections":   true,
			"can_view_own_inspections": true,
			"can_view_all_inspections": false,
			"can_edit_inspections":     true,
			"can_delete_inspections":   false,
			"can_create_templates":     false,
			"can_edit_templates":       false,
			"can_delete_templates":     false,
			"can_manage_users":         false,
			"can_view_reports":         false,
			"can_export_reports":       false,
			"can_upload_files":         true,
			"can_manage_notifications": false,
		}
	case "viewer":
		return map[string]interface{}{
			"can_create_inspections":   false,
			"can_view_own_inspections": true,
			"can_view_all_inspections": false,
			"can_edit_inspections":     false,
			"can_delete_inspections":   false,
			"can_create_templates":     false,
			"can_edit_templates":       false,
			"can_delete_templates":     false,
			"can_manage_users":         false,
			"can_view_reports":         false,
			"can_export_reports":       false,
			"can_upload_files":         false,
			"can_manage_notifications": false,
		}
	default:
		return GetDefaultPermissions("inspector")
	}
}
