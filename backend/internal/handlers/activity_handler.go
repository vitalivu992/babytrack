package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/vitalivu992/babytrack/internal/middleware"
	"github.com/vitalivu992/babytrack/internal/services"
)

// ActivityHandler exposes activity-log endpoints.
type ActivityHandler struct {
	activity *services.ActivityService
}

// NewActivityHandler constructs an ActivityHandler.
func NewActivityHandler(activity *services.ActivityService) *ActivityHandler {
	return &ActivityHandler{activity: activity}
}

// Create handles POST /api/children/:child_id/logs.
func (h *ActivityHandler) Create(c *gin.Context) {
	userID, ok := middleware.UserIDFrom(c)
	if !ok {
		Err(c, errNoUser)
		return
	}
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	var in services.CreateLogInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	log, err := h.activity.Create(c.Request.Context(), childID, userID, in)
	if err != nil {
		Err(c, err)
		return
	}
	Created(c, log)
}

// List handles GET /api/children/:child_id/logs with optional filters.
func (h *ActivityHandler) List(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	q := services.Query{
		Type:  c.Query("type"),
		Limit: atoiDefault(c.Query("limit"), 100),
	}
	if v := c.Query("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			q.From = &t
		}
	}
	if v := c.Query("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			q.To = &t
		}
	}
	logs, err := h.activity.List(c.Request.Context(), childID, q)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, logs)
}

// Delete handles DELETE /api/children/:child_id/logs/:id.
func (h *ActivityHandler) Delete(c *gin.Context) {
	id, err := parseParamID(c, "id")
	if err != nil {
		Err(c, errBadChildID)
		return
	}
	if err := h.activity.Delete(c.Request.Context(), id); err != nil {
		Err(c, err)
		return
	}
	OK(c, gin.H{"deleted": true})
}

// atoiDefault parses an int with a fallback.
func atoiDefault(s string, fallback int) int {
	n, err := strconv.Atoi(s)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}
