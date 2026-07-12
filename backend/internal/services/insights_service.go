package services

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/vitalivu992/babytrack/internal/models"
	"github.com/vitalivu992/babytrack/internal/repository"
)

// InsightsService computes cross-domain analytics: feeding/sleep totals and
// growth trends.
type InsightsService struct {
	logs    *repository.ActivityRepo
	measure *repository.MeasurementRepo
}

// NewInsightsService constructs an InsightsService.
func NewInsightsService(logs *repository.ActivityRepo, measure *repository.MeasurementRepo) *InsightsService {
	return &InsightsService{logs: logs, measure: measure}
}

// FeedingStats summarizes feeding over a window.
type FeedingStats struct {
	From         time.Time `json:"from"`
	To           time.Time `json:"to"`
	TotalCount   int       `json:"total_count"`
	TotalML      float64   `json:"total_ml"`
	AvgPerDay    float64   `json:"avg_per_day"`
	BySubtype    map[string]int `json:"by_subtype"`
}

// Feeding returns feeding stats for the [from,to] window (to defaults to now).
func (s *InsightsService) Feeding(ctx Ctx, childID uuid.UUID, from, to time.Time) (*FeedingStats, error) {
	logs, err := s.logs.GetLogsByChild(ctx, childID, models.LogTypeFeeding, &from, &to, 0)
	if err != nil {
		return nil, err
	}
	st := &FeedingStats{From: from, To: to, BySubtype: map[string]int{}}
	for _, l := range logs {
		st.TotalCount++
		st.TotalML += dataFloat(l.Data, "amount_ml")
		if sub := dataString(l.Data, "subtype"); sub != "" {
			st.BySubtype[sub]++
		}
	}
	days := to.Sub(from).Hours() / 24
	if days < 1 {
		days = 1
	}
	st.AvgPerDay = float64(st.TotalCount) / days
	return st, nil
}

// SleepStats summarizes sleep over a window.
type SleepStats struct {
	From             time.Time `json:"from"`
	To               time.Time `json:"to"`
	TotalCount       int       `json:"total_count"`
	TotalMinutes     int       `json:"total_minutes"`
	AvgMinutesPerDay float64   `json:"avg_minutes_per_day"`
	BySubtype        map[string]int `json:"by_subtype"`
}

// Sleep returns sleep stats for the [from,to] window.
func (s *InsightsService) Sleep(ctx Ctx, childID uuid.UUID, from, to time.Time) (*SleepStats, error) {
	logs, err := s.logs.GetLogsByChild(ctx, childID, models.LogTypeSleep, &from, &to, 0)
	if err != nil {
		return nil, err
	}
	st := &SleepStats{From: from, To: to, BySubtype: map[string]int{}}
	for _, l := range logs {
		st.TotalCount++
		st.TotalMinutes += dataDurationMinutes(l.Data)
		if sub := dataString(l.Data, "subtype"); sub != "" {
			st.BySubtype[sub]++
		}
	}
	days := to.Sub(from).Hours() / 24
	if days < 1 {
		days = 1
	}
	st.AvgMinutesPerDay = float64(st.TotalMinutes) / days
	return st, nil
}

// GrowthPoint is one measurement on a growth curve.
type GrowthPoint struct {
	Date  time.Time `json:"date"`
	Value float64   `json:"value"`
}

// GrowthSeries is a typed series of points for charting.
type GrowthSeries struct {
	Type   string        `json:"type"`
	Unit   string        `json:"unit"`
	Points []GrowthPoint `json:"points"`
}

// Growth returns weight/height/head-circumference series for charting.
func (s *InsightsService) Growth(ctx Ctx, childID uuid.UUID) ([]GrowthSeries, error) {
	ms, err := s.measure.GetByChild(ctx, childID, "")
	if err != nil {
		return nil, err
	}
	byType := map[string]*GrowthSeries{}
	for _, m := range ms {
		series, ok := byType[m.Type]
		if !ok {
			series = &GrowthSeries{Type: m.Type, Unit: m.Unit}
			byType[m.Type] = series
		}
		series.Points = append(series.Points, GrowthPoint{Date: m.MeasuredAt, Value: m.Value})
	}
	out := make([]GrowthSeries, 0, len(byType))
	for _, s2 := range byType {
		out = append(out, *s2)
	}
	return out, nil
}

// dataString extracts a string field from a JSONB payload.
func dataString(data []byte, key string) string {
	if len(data) == 0 {
		return ""
	}
	var m map[string]interface{}
	if err := json.Unmarshal(data, &m); err != nil {
		return ""
	}
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}
