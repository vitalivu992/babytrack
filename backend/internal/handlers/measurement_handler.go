package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/vitalivu992/babytrack/internal/models"
	"github.com/vitalivu992/babytrack/internal/repository"
)

// MeasurementHandler exposes measurement endpoints. It uses the repo directly
// since measurements have no business logic beyond validation.
type MeasurementHandler struct {
	repo *repository.MeasurementRepo
}

// NewMeasurementHandler constructs a MeasurementHandler.
func NewMeasurementHandler(repo *repository.MeasurementRepo) *MeasurementHandler {
	return &MeasurementHandler{repo: repo}
}

type measurementInput struct {
	Type       string  `json:"type"`
	Value      float64 `json:"value"`
	Unit       string  `json:"unit"`
	MeasuredAt string  `json:"measured_at"`
	Note       string  `json:"note"`
}

func (in *measurementInput) toModel(childID uuid.UUID) (*models.Measurement, error) {
	if in.Type == "" || in.Unit == "" {
		return nil, errValidation("type and unit are required")
	}
	m := &models.Measurement{
		ChildID: childID,
		Type:    in.Type,
		Value:   in.Value,
		Unit:    in.Unit,
		Note:    in.Note,
	}
	if in.MeasuredAt != "" {
		t, err := time.Parse("2006-01-02", in.MeasuredAt)
		if err != nil {
			return nil, errValidation("measured_at must be YYYY-MM-DD")
		}
		m.MeasuredAt = t
	} else {
		m.MeasuredAt = time.Now()
	}
	return m, nil
}

// Create handles POST /api/children/:child_id/measurements.
func (h *MeasurementHandler) Create(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	var in measurementInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	m, err := in.toModel(childID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.repo.Create(c.Request.Context(), m); err != nil {
		Err(c, err)
		return
	}
	Created(c, m)
}

// List handles GET /api/children/:child_id/measurements?type=weight.
func (h *MeasurementHandler) List(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	list, err := h.repo.GetByChild(c.Request.Context(), childID, c.Query("type"))
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, list)
}

// Update handles PATCH /api/children/:child_id/measurements/:id.
func (h *MeasurementHandler) Update(c *gin.Context) {
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
	var in measurementInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if in.Type != "" {
		existing.Type = in.Type
	}
	if in.Unit != "" {
		existing.Unit = in.Unit
	}
	if in.Value != 0 {
		existing.Value = in.Value
	}
	if in.MeasuredAt != "" {
		if t, err := time.Parse("2006-01-02", in.MeasuredAt); err == nil {
			existing.MeasuredAt = t
		}
	}
	existing.Note = in.Note
	if err := h.repo.Update(c.Request.Context(), existing); err != nil {
		Err(c, err)
		return
	}
	OK(c, existing)
}

// Delete handles DELETE /api/children/:child_id/measurements/:id.
func (h *MeasurementHandler) Delete(c *gin.Context) {
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
