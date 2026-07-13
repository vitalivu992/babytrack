package handlers

import (
	"time"

	"github.com/gin-gonic/gin"

	"github.com/vitalivu992/babytrack/internal/services"
)

// InsightsHandler exposes analytics endpoints.
type InsightsHandler struct {
	activity *services.ActivityService
	insights *services.InsightsService
}

// NewInsightsHandler constructs an InsightsHandler.
func NewInsightsHandler(activity *services.ActivityService, insights *services.InsightsService) *InsightsHandler {
	return &InsightsHandler{activity: activity, insights: insights}
}

// parseDay returns the date (00:00 local) from a `date` query, or today.
func parseDay(c *gin.Context) time.Time {
	loc := time.Local
	if v := c.Query("date"); v != "" {
		if t, err := time.ParseInLocation("2006-01-02", v, loc); err == nil {
			return t
		}
	}
	y, m, d := time.Now().In(loc).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, loc)
}

// parseWindow returns a [from,to] window from from/to query params defaulting
// to the last 7 days.
func parseWindow(c *gin.Context) (time.Time, time.Time) {
	loc := time.Local
	to := time.Now().In(loc)
	from := to.AddDate(0, 0, -7)
	if v := c.Query("from"); v != "" {
		if t, err := time.ParseInLocation("2006-01-02", v, loc); err == nil {
			from = t
		}
	}
	if v := c.Query("to"); v != "" {
		if t, err := time.ParseInLocation("2006-01-02", v, loc); err == nil {
			to = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, loc)
		}
	}
	return from, to
}

// Daily handles GET /api/children/:child_id/insights/daily.
func (h *InsightsHandler) Daily(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	ds, err := h.activity.Daily(c.Request.Context(), childID, parseDay(c))
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, ds)
}

// Weekly handles GET /api/children/:child_id/insights/weekly.
func (h *InsightsHandler) Weekly(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	ws, err := h.activity.Weekly(c.Request.Context(), childID, parseDay(c))
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, ws)
}

// Feeding handles GET /api/children/:child_id/insights/feeding.
func (h *InsightsHandler) Feeding(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	from, to := parseWindow(c)
	st, err := h.insights.Feeding(c.Request.Context(), childID, from, to)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, st)
}

// Sleep handles GET /api/children/:child_id/insights/sleep.
func (h *InsightsHandler) Sleep(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	from, to := parseWindow(c)
	st, err := h.insights.Sleep(c.Request.Context(), childID, from, to)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, st)
}

// Growth handles GET /api/children/:child_id/insights/growth.
func (h *InsightsHandler) Growth(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	series, err := h.insights.Growth(c.Request.Context(), childID)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, series)
}
