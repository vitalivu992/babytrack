package handlers

import (
	"time"

	"github.com/gin-gonic/gin"

	"github.com/vitalivu992/babytrack/internal/services"
)

// VaccinationHandler exposes vaccination endpoints.
type VaccinationHandler struct {
	vaccines *services.VaccinationService
}

// NewVaccinationHandler constructs a VaccinationHandler.
func NewVaccinationHandler(vaccines *services.VaccinationService) *VaccinationHandler {
	return &VaccinationHandler{vaccines: vaccines}
}

// List handles GET /api/children/:child_id/vaccinations.
func (h *VaccinationHandler) List(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	list, err := h.vaccines.ListByChild(c.Request.Context(), childID)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, list)
}

// Upcoming handles GET /api/children/:child_id/vaccinations/upcoming.
func (h *VaccinationHandler) Upcoming(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	limit := atoiDefault(c.Query("limit"), 10)
	list, err := h.vaccines.Upcoming(c.Request.Context(), childID, limit)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, list)
}

type administerInput struct {
	AdministeredDate string `json:"administered_date"`
	LotNumber        string `json:"lot_number"`
}

// MarkAdministered handles PATCH /api/children/:child_id/vaccinations/:id.
func (h *VaccinationHandler) MarkAdministered(c *gin.Context) {
	id, err := parseParamID(c, "id")
	if err != nil {
		Err(c, errBadID)
		return
	}
	var in administerInput
	_ = c.ShouldBindJSON(&in)
	var when time.Time
	if in.AdministeredDate != "" {
		if t, err := time.Parse("2006-01-02", in.AdministeredDate); err == nil {
			when = t
		}
	}
	v, err := h.vaccines.MarkAdministered(c.Request.Context(), id, when, in.LotNumber)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, v)
}

// GenerateSchedule handles POST /api/children/:child_id/vaccinations/schedule.
func (h *VaccinationHandler) GenerateSchedule(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	list, err := h.vaccines.GenerateSchedule(c.Request.Context(), childID)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, list)
}

// Delete handles DELETE /api/children/:child_id/vaccinations/:id.
func (h *VaccinationHandler) Delete(c *gin.Context) {
	id, err := parseParamID(c, "id")
	if err != nil {
		Err(c, errBadID)
		return
	}
	if err := h.vaccines.Delete(c.Request.Context(), id); err != nil {
		Err(c, err)
		return
	}
	OK(c, gin.H{"deleted": true})
}

// EnsureSchedule handles GET /api/children/:child_id/vaccinations/ensure.
func (h *VaccinationHandler) EnsureSchedule(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	list, err := h.vaccines.EnsureSchedule(c.Request.Context(), childID)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, list)
}
