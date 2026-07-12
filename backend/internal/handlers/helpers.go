package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Shared handler-layer sentinel errors.
var (
	errNoUser     = errors.New("no authenticated user in context")
	errBadChildID = errors.New("invalid or missing child_id")
	errBadID      = errors.New("invalid id")
)

// parseParamID parses a UUID path parameter into a uuid.UUID.
func parseParamID(c *gin.Context, name string) (uuid.UUID, error) {
	return uuid.Parse(c.Param(name))
}

// errValidation returns a handler-level validation error (mapped to 400).
type validationErr struct{ msg string }

func (e *validationErr) Error() string { return e.msg }

// errValidation wraps a message as a 400-mapped validation error.
func errValidation(msg string) error { return &validationErr{msg: msg} }
