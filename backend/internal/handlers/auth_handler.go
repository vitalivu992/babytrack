package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/vitalivu992/babytrack/internal/middleware"
	"github.com/vitalivu992/babytrack/internal/services"
)

// AuthHandler exposes authentication endpoints.
type AuthHandler struct {
	auth  *services.AuthService
	isDev bool
}

// NewAuthHandler constructs an AuthHandler.
func NewAuthHandler(auth *services.AuthService, isDev bool) *AuthHandler {
	return &AuthHandler{auth: auth, isDev: isDev}
}

// Register handles POST /api/auth/register.
func (h *AuthHandler) Register(c *gin.Context) {
	var in services.RegisterInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	u, err := h.auth.Register(c.Request.Context(), in)
	if err != nil {
		Err(c, err)
		return
	}
	Created(c, u)
}

// Login handles POST /api/auth/login.
func (h *AuthHandler) Login(c *gin.Context) {
	var in services.LoginInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	res, err := h.auth.Login(c.Request.Context(), in)
	if err != nil {
		Err(c, err)
		return
	}
	c.SetCookie("token", res.Token, 24*3600, "/", "", !h.isDev, true)
	OK(c, res)
}

// Me handles GET /api/auth/me.
func (h *AuthHandler) Me(c *gin.Context) {
	userID, ok := middleware.UserIDFrom(c)
	if !ok {
		Err(c, errors.New("no user in context"))
		return
	}
	OK(c, gin.H{
		"id":    userID,
		"email": c.GetString(middleware.CtxUserEmail),
	})
}
