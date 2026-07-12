package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/vitalivu992/babytrack/internal/services"
)

const (
	// CtxUserID is the context key for the authenticated user's id.
	CtxUserID = "user_id"
	// CtxUserEmail is the context key for the authenticated user's email.
	CtxUserEmail = "user_email"
	// CtxClaims is the context key for the parsed JWT claims.
	CtxClaims = "claims"
)

// Auth returns middleware that validates the bearer JWT and injects the user id
// and email into the request context.
func Auth(auth *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			abortUnauthorized(c, "missing or invalid authorization header")
			return
		}
		claims, err := auth.ValidateJWT(token)
		if err != nil {
			abortUnauthorized(c, "invalid token")
			return
		}
		c.Set(CtxUserID, claims.UserID)
		c.Set(CtxUserEmail, claims.Email)
		c.Set(CtxClaims, claims)
		c.Next()
	}
}

// extractToken pulls a bearer token from the Authorization header or a cookie.
func extractToken(c *gin.Context) string {
	h := c.GetHeader("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	if v, err := c.Cookie("token"); err == nil && v != "" {
		return v
	}
	return ""
}

// abortUnauthorized helper.
func abortUnauthorized(c *gin.Context, msg string) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": msg})
}

// UserIDFrom returns the authenticated user id from the gin context.
func UserIDFrom(c *gin.Context) (uuid.UUID, bool) {
	v, ok := c.Get(CtxUserID)
	if !ok {
		return uuid.Nil, false
	}
	id, ok := v.(uuid.UUID)
	return id, ok
}
