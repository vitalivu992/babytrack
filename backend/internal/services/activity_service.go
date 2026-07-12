package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/vitalivu992/babytrack/internal/models"
	"github.com/vitalivu992/babytrack/internal/repository"
)

// ActivityService owns activity-log creation, querying, and summaries.
type ActivityService struct {
	logs *repository.ActivityRepo
}

// NewActivityService constructs an ActivityService.
func NewActivityService(logs *repository.ActivityRepo) *ActivityService {
	return &ActivityService{logs: logs}
}

// CreateLogInput holds the fields needed to create a log.
type CreateLogInput struct {
	Type      string          `json:"type"`
	Data      json.RawMessage `json:"data"`
	Timestamp *time.Time      `json:"timestamp"`
	Note      string          `json:"note"`
}

var allowedTypes = map[string]bool{
	models.LogTypeFeeding:     true,
	models.LogTypeDiaper:      true,
	models.LogTypeSleep:       true,
	models.LogTypeMeasurement: true,
	models.LogTypeMedicine:    true,
	models.LogTypeOther:       true,
}

// Create stores a new activity log for a child.
func (s *ActivityService) Create(ctx Ctx, childID, userID uuid.UUID, in CreateLogInput) (*models.ActivityLog, error) {
	if !allowedTypes[in.Type] {
		return nil, fmtw("%w: unsupported type %q", ErrValidation, in.Type)
	}
	if len(in.Data) == 0 {
		in.Data = json.RawMessage(`{}`)
	}
	// Validate the data payload is well-formed JSON.
	if !json.Valid(in.Data) {
		return nil, fmtw("%w: data must be valid JSON", ErrValidation)
	}
	l := &models.ActivityLog{
		ChildID:   childID,
		UserID:    userID,
		Type:      in.Type,
		Data:      in.Data,
		Note:      in.Note,
		Timestamp: time.Now(),
	}
	if in.Timestamp != nil && !in.Timestamp.IsZero() {
		l.Timestamp = *in.Timestamp
	}
	if err := s.logs.CreateLog(ctx, l); err != nil {
		return nil, fmt.Errorf("create log: %w", err)
	}
	return l, nil
}

// Query filters logs by type and an optional [from,to] window.
type Query struct {
	Type   string
	From   *time.Time
	To     *time.Time
	Limit  int
}

// List returns logs for a child according to the query.
func (s *ActivityService) List(ctx Ctx, childID uuid.UUID, q Query) ([]*models.ActivityLog, error) {
	if q.Limit == 0 {
		q.Limit = 100
	}
	return s.logs.GetLogsByChild(ctx, childID, q.Type, q.From, q.To, q.Limit)
}

// Delete removes a log. Only the author (or an editor/owner — caller enforces)
// may delete it.
func (s *ActivityService) Delete(ctx Ctx, id uuid.UUID) error {
	err := s.logs.DeleteLog(ctx, id, nil)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return err
	}
	return err
}

// DailySummary groups counts/totals for a single day.
type DailySummary struct {
	Date         time.Time `json:"date"`
	FeedingCount int       `json:"feeding_count"`
	DiaperCount  int       `json:"diaper_count"`
	SleepCount   int       `json:"sleep_count"`
	SleepMinutes int       `json:"sleep_minutes"`
	FeedingML    float64   `json:"feeding_ml"`
	Logs         []*models.ActivityLog `json:"logs,omitempty"`
}

// Daily returns a summary for the given day (day in the child's local context).
func (s *ActivityService) Daily(ctx Ctx, childID uuid.UUID, day time.Time) (*DailySummary, error) {
	start := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, day.Location())
	end := start.Add(24 * time.Hour)
	logs, err := s.logs.GetLogsByChild(ctx, childID, "", &start, &end, 0)
	if err != nil {
		return nil, err
	}
	return summarizeDay(day, logs), nil
}

func summarizeDay(day time.Time, logs []*models.ActivityLog) *DailySummary {
	ds := &DailySummary{Date: day}
	for _, l := range logs {
		switch l.Type {
		case models.LogTypeFeeding:
			ds.FeedingCount++
			ds.FeedingML += dataFloat(l.Data, "amount_ml")
		case models.LogTypeDiaper:
			ds.DiaperCount++
		case models.LogTypeSleep:
			ds.SleepCount++
			ds.SleepMinutes += dataDurationMinutes(l.Data)
		}
	}
	return ds
}

// WeeklySummary aggregates seven daily summaries plus totals.
type WeeklySummary struct {
	From         time.Time      `json:"from"`
	To           time.Time      `json:"to"`
	FeedingCount int            `json:"feeding_count"`
	DiaperCount  int            `json:"diaper_count"`
	SleepCount   int            `json:"sleep_count"`
	SleepMinutes int            `json:"sleep_minutes"`
	FeedingML    float64        `json:"feeding_ml"`
	Days         []DailySummary `json:"days"`
}

// Weekly returns a rolling 7-day summary ending at `endDay`.
func (s *ActivityService) Weekly(ctx Ctx, childID uuid.UUID, endDay time.Time) (*WeeklySummary, error) {
	start := time.Date(endDay.Year(), endDay.Month(), endDay.Day(), 0, 0, 0, 0, endDay.Location()).AddDate(0, 0, -6)
	end := start.AddDate(0, 0, 7)
	logs, err := s.logs.GetLogsByChild(ctx, childID, "", &start, &end, 0)
	if err != nil {
		return nil, err
	}

	byDay := make(map[string][]*models.ActivityLog)
	for _, l := range logs {
		key := l.Timestamp.In(endDay.Location()).Format("2006-01-02")
		byDay[key] = append(byDay[key], l)
	}

	ws := &WeeklySummary{From: start, To: end.Add(-time.Nanosecond)}
	for i := 0; i < 7; i++ {
		day := start.AddDate(0, 0, i)
		key := day.Format("2006-01-02")
		ds := summarizeDay(day, byDay[key])
		ws.Days = append(ws.Days, *ds)
		ws.FeedingCount += ds.FeedingCount
		ws.DiaperCount += ds.DiaperCount
		ws.SleepCount += ds.SleepCount
		ws.SleepMinutes += ds.SleepMinutes
		ws.FeedingML += ds.FeedingML
	}
	return ws, nil
}

// dataFloat extracts a numeric field from a JSONB payload, tolerating
// ints/floats and missing keys.
func dataFloat(data []byte, key string) float64 {
	if len(data) == 0 {
		return 0
	}
	var m map[string]interface{}
	if err := json.Unmarshal(data, &m); err != nil {
		return 0
	}
	v, ok := m[key]
	if !ok {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	case json.Number:
		f, _ := n.Float64()
		return f
	}
	return 0
}

// dataDurationMinutes sums duration_minutes or derives it from start/end times.
func dataDurationMinutes(data []byte) int {
	if len(data) == 0 {
		return 0
	}
	var m map[string]interface{}
	if err := json.Unmarshal(data, &m); err != nil {
		return 0
	}
	if _, ok := m["duration_minutes"]; ok {
		return int(dataFloat(data, "duration_minutes"))
	}
	startStr, _ := m["start"].(string)
	endStr, _ := m["end"].(string)
	if startStr != "" && endStr != "" {
		st, err1 := time.Parse(time.RFC3339, startStr)
		en, err2 := time.Parse(time.RFC3339, endStr)
		if err1 == nil && err2 == nil && en.After(st) {
			return int(en.Sub(st).Minutes())
		}
	}
	return 0
}
