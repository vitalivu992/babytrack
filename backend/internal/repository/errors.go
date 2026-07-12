package repository

import "errors"

// Sentinel errors for the repository layer.
var (
	// ErrNotFound is returned when a query matches no rows.
	ErrNotFound = errors.New("not found")
	// ErrConflict is returned on a unique-constraint violation.
	ErrConflict = errors.New("conflict")
)
