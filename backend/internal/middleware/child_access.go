package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/vitalivu992/babytrack/internal/services"
)

const (
	// CtxChildID is the context key for the resolved child id from the path.
	CtxChildID = "child_id"
	// CtxChildRole is the context key for the requesting user's role on the child.
	CtxChildRole = "child_role"
)

// RequireAccess returns middleware that:
//  1. requires a ":child_id" path param (as a UUID),
//  2. verifies the authenticated user has any access to that child,
//  3. (optionally) enforces a minimum role via `minRole`,
//  4. injects the child id and role into the gin context.
//
// minRole of "" means any role (viewer+) is acceptable.
func RequireAccess(share *services.ShareService, minRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := UserIDFrom(c)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		childIDStr := c.Param("child_id")
		childID, err := uuid.Parse(childIDStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid child_id"})
			return
		}
		role, err := share.RoleFor(c.Request.Context(), childID, userID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}
		if minRole != "" && !roleAtLeast(role, minRole) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}
		c.Set(CtxChildID, childID)
		c.Set(CtxChildRole, role)
		c.Next()
	}
}

// roleRank orders roles so a minimum-role check is straightforward.
var roleRank = map[string]int{
	"viewer": 1,
	"editor": 2,
	"owner":  3,
}

// roleAtLeast reports whether `role` meets the minimum `min`.
func roleAtLeast(role, min string) bool {
	if roleRank[role] >= roleRank[min] {
		return true
	}
	return false
}

// ChildIDFrom returns the resolved child id from the gin context.
func ChildIDFrom(c *gin.Context) (uuid.UUID, bool) {
	v, ok := c.Get(CtxChildID)
	if !ok {
		return uuid.Nil, false
	}
	id, ok := v.(uuid.UUID)
	return id, ok
}
