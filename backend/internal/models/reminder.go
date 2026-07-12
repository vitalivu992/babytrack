package models

import (
	"time"

	"github.com/google/uuid"
)

// Reminder is a recurring or one-off nudge tied to a child.
type Reminder struct {
	ID        uuid.UUID `json:"id"`
	ChildID   uuid.UUID `json:"child_id" db:"child_id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	Title     string    `json:"title"`
	Cron      string    `json:"cron,omitempty"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
