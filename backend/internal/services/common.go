package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

// Ctx is an alias used across the service layer for readability.
type Ctx = context.Context

// Sentinel service-layer errors. Handlers map these to HTTP status codes.
var (
	// ErrInvalidCredentials is returned on bad login email/password.
	ErrInvalidCredentials = errors.New("invalid credentials")
	// ErrInvalidToken is returned when a JWT cannot be validated.
	ErrInvalidToken = errors.New("invalid token")
	// ErrEmailTaken is returned when registering an email that already exists.
	ErrEmailTaken = errors.New("email already registered")
	// ErrAccessDenied is returned when a user lacks the required role.
	ErrAccessDenied = errors.New("access denied")
	// ErrValidation is returned for invalid request input.
	ErrValidation = errors.New("validation error")
	// ErrExpired is returned when an invitation has expired.
	ErrExpired = errors.New("invitation expired")
	// ErrAlreadyAccepted is returned when an invitation was already used.
	ErrAlreadyAccepted = errors.New("invitation already accepted")
)

var emailRE = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

// normalizeEmail lower-cases and trims an email.
func normalizeEmail(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

// validateRegister checks registration input.
func validateRegister(in RegisterInput) error {
	if !emailRE.MatchString(in.Email) {
		return fmtw("%w: invalid email", ErrValidation)
	}
	if len(in.Password) < 8 {
		return fmtw("%w: password must be at least 8 characters", ErrValidation)
	}
	return nil
}

// isUniqueViolation reports whether err is a Postgres unique violation.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

// jwtSecretBytes returns the configured JWT secret as bytes.
func jwtSecretBytes() []byte { return []byte(os.Getenv("JWT_SECRET")) }

// fmtw is a thin wrapper over fmt.Errorf for brevity.
func fmtw(format string, args ...interface{}) error {
	return fmt.Errorf(format, args...)
}
