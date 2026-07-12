package models

import (
	"time"

	"github.com/google/uuid"
)

// Invitation is a pending share offer sent to an email address.
type Invitation struct {
	ID         uuid.UUID  `json:"id"`
	ChildID    uuid.UUID  `json:"child_id" db:"child_id"`
	Email      string     `json:"email"`
	Role       string     `json:"role"`
	Token      string     `json:"token,omitempty"`
	ExpiresAt  time.Time  `json:"expires_at" db:"expires_at"`
	AcceptedAt *time.Time `json:"accepted_at,omitempty" db:"accepted_at"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
}

// ChildUser represents a user's role on a given child.
type ChildUser struct {
	ChildID   uuid.UUID `json:"child_id" db:"child_id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	Role      string    `json:"role"`
	InvitedAt time.Time `json:"invited_at" db:"invited_at"`
	Email     string    `json:"email,omitempty"`
	Name      string    `json:"name,omitempty"`
}

// Share role constants.
const (
	RoleOwner  = "owner"
	RoleEditor = "editor"
	RoleViewer = "viewer"
)
