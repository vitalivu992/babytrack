// Package frontend embeds the compiled React SPA (frontend/dist) so the Go
// binary can serve it on the same port as the API without external files.
//
// The Makefile (and Dockerfile) build the Vite frontend and copy its dist
// output into this directory before compiling the Go binary. A placeholder
// (.gitkeep) is committed so the embed directive always resolves.
package frontend

import "embed"

// distFS holds the embedded production build of the frontend.
//
//go:embed all:dist
var distFS embed.FS
