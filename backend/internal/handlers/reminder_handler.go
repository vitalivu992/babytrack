package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/vitalivu992/babytrack/internal/middleware"
	"github.com/vitalivu992/babytrack/internal/models"
	"github.com/vitalivu992/babytrack/internal/repository"
)

// ReminderHandler exposes reminder endpoints.
type ReminderHandler struct {
	repo *repository.ReminderRepo
}

// NewReminderHandler constructs a ReminderHandler.
func NewReminderHandler(repo *repository.ReminderRepo) *ReminderHandler {
	return &ReminderHandler{repo: repo}
}

type reminderInput struct {
	Title   string `json:"title"`
	Cron    string `json:"cron"`
	Enabled *bool  `json:"enabled"`
}

// Create handles POST /api/children/:child_id/reminders.
func (h *ReminderHandler) Create(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	userID, ok := middleware.UserIDFrom(c)
	if !ok {
		Err(c, errNoUser)
		return
	}
	var in reminderInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title is required"})
		return
	}
	enabled := true
	if in.Enabled != nil {
		enabled = *in.Enabled
	}
	rm := &models.Reminder{
		ChildID: childID,
		UserID:  userID,
		Title:   in.Title,
		Cron:    in.Cron,
		Enabled: enabled,
	}
	if err := h.repo.Create(c.Request.Context(), rm); err != nil {
		Err(c, err)
		return
	}
	Created(c, rm)
}

// List handles GET /api/children/:child_id/reminders.
func (h *ReminderHandler) List(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	list, err := h.repo.GetByChild(c.Request.Context(), childID)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, list)
}

// Update handles PATCH /api/children/:child_id/reminders/:id.
func (h *ReminderHandler) Update(c *gin.Context) {
	id, err := parseParamID(c, "id")
	if err != nil {
		Err(c, errBadID)
		return
	}
	existing, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		Err(c, err)
		return
	}
	var in reminderInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if in.Title != "" {
		existing.Title = in.Title
	}
	if in.Cron != "" {
		existing.Cron = in.Cron
	}
	if in.Enabled != nil {
		existing.Enabled = *in.Enabled
	}
	if err := h.repo.Update(c.Request.Context(), existing); err != nil {
		Err(c, err)
		return
	}
	OK(c, existing)
}

// Delete handles DELETE /api/children/:child_id/reminders/:id.
func (h *ReminderHandler) Delete(c *gin.Context) {
	id, err := parseParamID(c, "id")
	if err != nil {
		Err(c, errBadID)
		return
	}
	if err := h.repo.Delete(c.Request.Context(), id); err != nil {
		Err(c, err)
		return
	}
	OK(c, gin.H{"deleted": true})
}
