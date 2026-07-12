package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORS returns middleware that permits cross-origin requests from the Vite dev
// server in development. In production the frontend is embedded (same-origin),
// so the policy is restrictive.
func CORS(dev bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if dev {
			c.Header("Access-Control-Allow-Origin", c.GetHeader("Origin"))
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(204)
				return
			}
		}
		c.Next()
	}
}
