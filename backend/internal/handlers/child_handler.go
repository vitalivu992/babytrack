package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/vitalivu992/babytrack/internal/middleware"
	"github.com/vitalivu992/babytrack/internal/services"
)

// ChildHandler exposes child CRUD endpoints.
type ChildHandler struct {
	children *services.ChildService
}

// NewChildHandler constructs a ChildHandler.
func NewChildHandler(children *services.ChildService) *ChildHandler {
	return &ChildHandler{children: children}
}

// List handles GET /api/children.
func (h *ChildHandler) List(c *gin.Context) {
	userID, ok := middleware.UserIDFrom(c)
	if !ok {
		Err(c, errNoUser)
		return
	}
	list, err := h.children.List(c.Request.Context(), userID)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, list)
}

// Create handles POST /api/children.
func (h *ChildHandler) Create(c *gin.Context) {
	userID, ok := middleware.UserIDFrom(c)
	if !ok {
		Err(c, errNoUser)
		return
	}
	var in services.CreateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	child, err := h.children.Create(c.Request.Context(), userID, in)
	if err != nil {
		Err(c, err)
		return
	}
	Created(c, child)
}

// Get handles GET /api/children/:child_id.
func (h *ChildHandler) Get(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	child, err := h.children.Get(c.Request.Context(), childID)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, child)
}

// Update handles PATCH /api/children/:child_id (editor+).
func (h *ChildHandler) Update(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	var in services.UpdateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	child, err := h.children.Update(c.Request.Context(), childID, in)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, child)
}

// Delete handles DELETE /api/children/:child_id (owner only — caller-enforced).
func (h *ChildHandler) Delete(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	if err := h.children.Delete(c.Request.Context(), childID); err != nil {
		Err(c, err)
		return
	}
	OK(c, gin.H{"deleted": true})
}

// childID resolves the :child_id path param into a uuid.UUID.
func childID(c *gin.Context) (uuid.UUID, bool) {
	if v, ok := middleware.ChildIDFrom(c); ok {
		return v, true
	}
	id, err := uuid.Parse(c.Param("child_id"))
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}
