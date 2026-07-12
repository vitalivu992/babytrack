package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/vitalivu992/babytrack/internal/middleware"
	"github.com/vitalivu992/babytrack/internal/services"
)

// ShareHandler exposes sharing / invitation endpoints.
type ShareHandler struct {
	share *services.ShareService
}

// NewShareHandler constructs a ShareHandler.
func NewShareHandler(share *services.ShareService) *ShareHandler {
	return &ShareHandler{share: share}
}

type inviteInput struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

// Invite handles POST /api/children/:child_id/invitations (owner only).
func (h *ShareHandler) Invite(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	var in inviteInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	inv, err := h.share.Invite(c.Request.Context(), childID, services.InviteInput(in))
	if err != nil {
		Err(c, err)
		return
	}
	Created(c, inv)
}

// Members handles GET /api/children/:child_id/members.
func (h *ShareHandler) Members(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	list, err := h.share.Members(c.Request.Context(), childID)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, list)
}

// Revoke handles DELETE /api/children/:child_id/members/:user_id (owner only).
func (h *ShareHandler) Revoke(c *gin.Context) {
	childID, ok := childID(c)
	if !ok {
		Err(c, errBadChildID)
		return
	}
	targetID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		Err(c, errBadID)
		return
	}
	if err := h.share.Revoke(c.Request.Context(), childID, targetID); err != nil {
		Err(c, err)
		return
	}
	OK(c, gin.H{"revoked": true})
}

type acceptInput struct {
	Token string `json:"token"`
}

// Accept handles POST /api/invitations/accept (authenticated, must match email).
func (h *ShareHandler) Accept(c *gin.Context) {
	userID, ok := middleware.UserIDFrom(c)
	if !ok {
		Err(c, errNoUser)
		return
	}
	email := c.GetString(middleware.CtxUserEmail)
	var in acceptInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token is required"})
		return
	}
	cu, err := h.share.Accept(c.Request.Context(), in.Token, userID, email)
	if err != nil {
		Err(c, err)
		return
	}
	OK(c, cu)
}
