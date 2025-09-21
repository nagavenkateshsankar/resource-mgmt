package services

import (
	"encoding/json"
	"fmt"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AnalyticsService struct {
	db *gorm.DB
}

func NewAnalyticsService() *AnalyticsService {
	return &AnalyticsService{
		db: config.DB,
	}
}

type DashboardStats struct {
	InspectionStats InspectionOverviewStats `json:"inspection_stats"`
	StatusChart     []StatusChartData       `json:"status_chart"`
	PriorityChart   []PriorityChartData     `json:"priority_chart"`
	TrendData       []TrendData             `json:"trend_data"`
	RecentActivity  []RecentActivityItem    `json:"recent_activity"`
	TopInspectors   []InspectorStats        `json:"top_inspectors"`
}

type InspectionOverviewStats struct {
	Total       int64 `json:"total"`
	Draft       int64 `json:"draft"`
	Assigned    int64 `json:"assigned"`
	InProgress  int64 `json:"in_progress"`
	Completed   int64 `json:"completed"`
	Overdue     int64 `json:"overdue"`
	DueToday    int64 `json:"due_today"`
	DueThisWeek int64 `json:"due_this_week"`
}

type StatusChartData struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
	Color  string `json:"color"`
}

type PriorityChartData struct {
	Priority string `json:"priority"`
	Count    int64  `json:"count"`
	Color    string `json:"color"`
}

type TrendData struct {
	Date      string `json:"date"`
	Created   int64  `json:"created"`
	Completed int64  `json:"completed"`
}

type RecentActivityItem struct {
	ID           uuid.UUID `json:"id"`
	Type         string    `json:"type"`
	Description  string    `json:"description"`
	CreatedAt    time.Time `json:"created_at"`
	SiteName     string    `json:"site_name"`
	InspectorID  string    `json:"inspector_id"`
}

type InspectorStats struct {
	InspectorID   string `json:"inspector_id"`
	InspectorName string `json:"inspector_name"`
	Total         int64  `json:"total"`
	Completed     int64  `json:"completed"`
	InProgress    int64  `json:"in_progress"`
	CompletionRate float64 `json:"completion_rate"`
}

func (s *AnalyticsService) GetDashboardStats(organizationID string, filters map[string]interface{}) (*DashboardStats, error) {
	stats := &DashboardStats{}

	// Get base query
	baseQuery := s.db.Model(&models.Inspection{}).Where("organization_id = ?", organizationID)

	// Apply filters if provided
	if startDate, ok := filters["start_date"].(string); ok && startDate != "" {
		baseQuery = baseQuery.Where("created_at >= ?", startDate)
	}
	if endDate, ok := filters["end_date"].(string); ok && endDate != "" {
		baseQuery = baseQuery.Where("created_at <= ?", endDate)
	}
	if inspectorID, ok := filters["inspector_id"].(string); ok && inspectorID != "" {
		baseQuery = baseQuery.Where("inspector_id = ?", inspectorID)
	}

	// Get inspection overview stats
	inspectionStats, err := s.getInspectionOverviewStats(baseQuery)
	if err != nil {
		return nil, err
	}
	stats.InspectionStats = *inspectionStats

	// Get status chart data
	statusChart, err := s.getStatusChartData(baseQuery)
	if err != nil {
		return nil, err
	}
	stats.StatusChart = statusChart

	// Get priority chart data
	priorityChart, err := s.getPriorityChartData(baseQuery)
	if err != nil {
		return nil, err
	}
	stats.PriorityChart = priorityChart

	// Get trend data (last 30 days)
	trendData, err := s.getTrendData(organizationID, 30)
	if err != nil {
		return nil, err
	}
	stats.TrendData = trendData

	// Get recent activity
	recentActivity, err := s.getRecentActivity(organizationID, 10)
	if err != nil {
		return nil, err
	}
	stats.RecentActivity = recentActivity

	// Get top inspectors
	topInspectors, err := s.getTopInspectors(organizationID, 5)
	if err != nil {
		return nil, err
	}
	stats.TopInspectors = topInspectors

	return stats, nil
}

func (s *AnalyticsService) getInspectionOverviewStats(baseQuery *gorm.DB) (*InspectionOverviewStats, error) {
	stats := &InspectionOverviewStats{}

	// Total inspections
	err := baseQuery.Count(&stats.Total).Error
	if err != nil {
		return nil, err
	}

	// Status counts
	statusCounts := []struct {
		Status string
		Count  int64
	}{}

	err = baseQuery.
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&statusCounts).Error
	if err != nil {
		return nil, err
	}

	for _, sc := range statusCounts {
		switch sc.Status {
		case "draft":
			stats.Draft = sc.Count
		case "assigned":
			stats.Assigned = sc.Count
		case "in_progress":
			stats.InProgress = sc.Count
		case "completed":
			stats.Completed = sc.Count
		}
	}

	// Overdue inspections
	now := time.Now()
	err = baseQuery.
		Where("due_date < ? AND status != ?", now, "completed").
		Count(&stats.Overdue).Error
	if err != nil {
		return nil, err
	}

	// Due today
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)
	err = baseQuery.
		Where("due_date >= ? AND due_date < ? AND status != ?", startOfDay, endOfDay, "completed").
		Count(&stats.DueToday).Error
	if err != nil {
		return nil, err
	}

	// Due this week
	startOfWeek := now.AddDate(0, 0, -int(now.Weekday()))
	startOfWeek = time.Date(startOfWeek.Year(), startOfWeek.Month(), startOfWeek.Day(), 0, 0, 0, 0, startOfWeek.Location())
	endOfWeek := startOfWeek.Add(7 * 24 * time.Hour)
	err = baseQuery.
		Where("due_date >= ? AND due_date < ? AND status != ?", startOfWeek, endOfWeek, "completed").
		Count(&stats.DueThisWeek).Error
	if err != nil {
		return nil, err
	}

	return stats, nil
}

func (s *AnalyticsService) getStatusChartData(baseQuery *gorm.DB) ([]StatusChartData, error) {
	var results []struct {
		Status string
		Count  int64
	}

	err := baseQuery.
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&results).Error
	if err != nil {
		return nil, err
	}

	statusColors := map[string]string{
		"draft":       "#94a3b8",
		"assigned":    "#3b82f6",
		"in_progress": "#f59e0b",
		"completed":   "#10b981",
	}

	chartData := make([]StatusChartData, 0)
	for _, result := range results {
		color, exists := statusColors[result.Status]
		if !exists {
			color = "#6b7280"
		}

		chartData = append(chartData, StatusChartData{
			Status: result.Status,
			Count:  result.Count,
			Color:  color,
		})
	}

	return chartData, nil
}

func (s *AnalyticsService) getPriorityChartData(baseQuery *gorm.DB) ([]PriorityChartData, error) {
	var results []struct {
		Priority string
		Count    int64
	}

	err := baseQuery.
		Select("priority, COUNT(*) as count").
		Group("priority").
		Scan(&results).Error
	if err != nil {
		return nil, err
	}

	priorityColors := map[string]string{
		"low":    "#10b981",
		"medium": "#f59e0b",
		"high":   "#f97316",
		"urgent": "#ef4444",
	}

	chartData := make([]PriorityChartData, 0)
	for _, result := range results {
		color, exists := priorityColors[result.Priority]
		if !exists {
			color = "#6b7280"
		}

		chartData = append(chartData, PriorityChartData{
			Priority: result.Priority,
			Count:    result.Count,
			Color:    color,
		})
	}

	return chartData, nil
}

func (s *AnalyticsService) getTrendData(organizationID string, days int) ([]TrendData, error) {
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -days)

	query := `
		WITH date_series AS (
			SELECT date_trunc('day', generate_series($1::timestamp, $2::timestamp, '1 day'::interval)) as date
		),
		created_counts AS (
			SELECT
				date_trunc('day', created_at) as date,
				COUNT(*) as created
			FROM inspections
			WHERE organization_id = $3
				AND created_at >= $1
				AND created_at <= $2
			GROUP BY date_trunc('day', created_at)
		),
		completed_counts AS (
			SELECT
				date_trunc('day', updated_at) as date,
				COUNT(*) as completed
			FROM inspections
			WHERE organization_id = $3
				AND status = 'completed'
				AND updated_at >= $1
				AND updated_at <= $2
			GROUP BY date_trunc('day', updated_at)
		)
		SELECT
			ds.date,
			COALESCE(cc.created, 0) as created,
			COALESCE(comp.completed, 0) as completed
		FROM date_series ds
		LEFT JOIN created_counts cc ON ds.date = cc.date
		LEFT JOIN completed_counts comp ON ds.date = comp.date
		ORDER BY ds.date
	`

	var results []struct {
		Date      time.Time
		Created   int64
		Completed int64
	}

	err := s.db.Raw(query, startDate, endDate, organizationID).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	trendData := make([]TrendData, 0)
	for _, result := range results {
		trendData = append(trendData, TrendData{
			Date:      result.Date.Format("2006-01-02"),
			Created:   result.Created,
			Completed: result.Completed,
		})
	}

	return trendData, nil
}

func (s *AnalyticsService) getRecentActivity(organizationID string, limit int) ([]RecentActivityItem, error) {
	var inspections []models.Inspection

	err := s.db.
		Preload("Site").
		Where("organization_id = ?", organizationID).
		Order("updated_at DESC").
		Limit(limit).
		Find(&inspections).Error
	if err != nil {
		return nil, err
	}

	activity := make([]RecentActivityItem, 0)
	for _, inspection := range inspections {
		var activityType string
		var description string

		siteName := "Unknown Site"
		if inspection.Site.Name != "" {
			siteName = inspection.Site.Name
		}

		switch inspection.Status {
		case "completed":
			activityType = "completed"
			description = fmt.Sprintf("Inspection completed at %s", siteName)
		case "in_progress":
			activityType = "started"
			description = fmt.Sprintf("Inspection started at %s", siteName)
		case "assigned":
			activityType = "assigned"
			description = fmt.Sprintf("Inspection assigned at %s", siteName)
		default:
			activityType = "created"
			description = fmt.Sprintf("Inspection created at %s", siteName)
		}

		activity = append(activity, RecentActivityItem{
			ID:           inspection.ID,
			Type:         activityType,
			Description:  description,
			CreatedAt:    inspection.UpdatedAt,
			SiteName:     siteName,
			InspectorID:  inspection.InspectorID,
		})
	}

	return activity, nil
}

func (s *AnalyticsService) getTopInspectors(organizationID string, limit int) ([]InspectorStats, error) {
	query := `
		SELECT
			i.inspector_id,
			u.name as inspector_name,
			COUNT(*) as total,
			COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed,
			COUNT(CASE WHEN i.status = 'in_progress' THEN 1 END) as in_progress,
			CASE
				WHEN COUNT(*) > 0 THEN
					ROUND((COUNT(CASE WHEN i.status = 'completed' THEN 1 END)::float / COUNT(*)::float) * 100, 2)
				ELSE 0
			END as completion_rate
		FROM inspections i
		LEFT JOIN users u ON i.inspector_id = u.id
		WHERE i.organization_id = $1
			AND i.inspector_id IS NOT NULL
			AND i.inspector_id != ''
		GROUP BY i.inspector_id, u.name
		ORDER BY completion_rate DESC, total DESC
		LIMIT $2
	`

	var results []struct {
		InspectorID    string  `db:"inspector_id"`
		InspectorName  string  `db:"inspector_name"`
		Total          int64   `db:"total"`
		Completed      int64   `db:"completed"`
		InProgress     int64   `db:"in_progress"`
		CompletionRate float64 `db:"completion_rate"`
	}

	err := s.db.Raw(query, organizationID, limit).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	inspectorStats := make([]InspectorStats, 0)
	for _, result := range results {
		inspectorStats = append(inspectorStats, InspectorStats{
			InspectorID:    result.InspectorID,
			InspectorName:  result.InspectorName,
			Total:          result.Total,
			Completed:      result.Completed,
			InProgress:     result.InProgress,
			CompletionRate: result.CompletionRate,
		})
	}

	return inspectorStats, nil
}

func (s *AnalyticsService) ExportInspectionReport(organizationID string, format string, filters map[string]interface{}) ([]byte, string, error) {
	// Get inspections based on filters
	query := s.db.Model(&models.Inspection{}).Where("organization_id = ?", organizationID)

	// Apply filters
	if startDate, ok := filters["start_date"].(string); ok && startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate, ok := filters["end_date"].(string); ok && endDate != "" {
		query = query.Where("created_at <= ?", endDate)
	}
	if status, ok := filters["status"].(string); ok && status != "" {
		query = query.Where("status = ?", status)
	}
	if priority, ok := filters["priority"].(string); ok && priority != "" {
		query = query.Where("priority = ?", priority)
	}

	var inspections []models.Inspection
	err := query.
		Preload("Template").
		Preload("Site").
		Order("created_at DESC").
		Find(&inspections).Error
	if err != nil {
		return nil, "", err
	}

	switch format {
	case "csv":
		return s.generateCSVReport(inspections)
	case "json":
		return s.generateJSONReport(inspections)
	default:
		return nil, "", fmt.Errorf("unsupported format: %s", format)
	}
}

func (s *AnalyticsService) generateCSVReport(inspections []models.Inspection) ([]byte, string, error) {
	csvContent := "ID,Site Location,Site Name,Status,Priority,Inspector ID,Created At,Updated At,Due Date,Template Name\n"

	for _, inspection := range inspections {
		templateName := ""
		if inspection.Template.Name != "" {
			templateName = inspection.Template.Name
		}

		dueDate := ""
		if inspection.DueDate != nil {
			dueDate = inspection.DueDate.Format("2006-01-02")
		}

		siteName := "Unknown Site"
		siteAddress := "Unknown Address"
		if inspection.Site.Name != "" {
			siteName = inspection.Site.Name
		}
		if inspection.Site.Address != "" {
			siteAddress = inspection.Site.Address
		}

		line := fmt.Sprintf("%d,%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
			inspection.ID,
			siteName,
			siteAddress,
			inspection.Status,
			inspection.Priority,
			inspection.InspectorID,
			inspection.CreatedAt.Format("2006-01-02 15:04:05"),
			inspection.UpdatedAt.Format("2006-01-02 15:04:05"),
			dueDate,
			templateName,
		)
		csvContent += line
	}

	filename := fmt.Sprintf("inspections_report_%s.csv", time.Now().Format("20060102_150405"))
	return []byte(csvContent), filename, nil
}

func (s *AnalyticsService) generateJSONReport(inspections []models.Inspection) ([]byte, string, error) {
	type ReportData struct {
		GeneratedAt  time.Time             `json:"generated_at"`
		TotalRecords int                   `json:"total_records"`
		Inspections  []models.Inspection   `json:"inspections"`
	}

	report := ReportData{
		GeneratedAt:  time.Now(),
		TotalRecords: len(inspections),
		Inspections:  inspections,
	}

	jsonData, err := json.Marshal(report)
	if err != nil {
		return nil, "", err
	}

	filename := fmt.Sprintf("inspections_report_%s.json", time.Now().Format("20060102_150405"))
	return jsonData, filename, nil
}