package frontend

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// indexHTML is cached so client-side route fallback is cheap.
var indexHTML []byte

// Handler returns a Gin handler that serves the embedded SPA. Requests for
// existing static assets are served as-is; any other non-API path falls back
// to index.html so the React router can take over (SPA history fallback).
func Handler() (gin.HandlerFunc, error) {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		return nil, err
	}
	indexHTML, err = distFS.ReadFile("dist/index.html")
	if err != nil {
		return nil, err
	}
	fileServer := http.FileServer(http.FS(sub))

	return func(c *gin.Context) {
		// API and health paths are handled by registered routes; if a request
		// reaches here it is an unknown API path and should 404 as JSON.
		if strings.HasPrefix(c.Request.URL.Path, "/api/") || c.Request.URL.Path == "/healthz" {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}

		// Serve the file directly if it exists in the embedded FS.
		rel := strings.TrimPrefix(c.Request.URL.Path, "/")
		if rel != "" {
			if info, err := fs.Stat(sub, rel); err == nil && !info.IsDir() {
				fileServer.ServeHTTP(c.Writer, c.Request)
				return
			}
		}

		// SPA fallback: return index.html for client-side routing.
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", indexHTML)
	}, nil
}
