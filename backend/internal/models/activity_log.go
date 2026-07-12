package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ActivityLog records a single baby activity event. The flexible per-type
// details live in Data (feeding amounts, diaper contents, sleep ranges, ...).
type ActivityLog struct {
	ID        uuid.UUID       `json:"id"`
	ChildID   uuid.UUID       `json:"child_id" db:"child_id"`
	UserID    uuid.UUID       `json:"user_id" db:"user_id"`
	Type      string          `json:"type"`
	Data      json.RawMessage `json:"data,omitempty"`
	Timestamp time.Time       `json:"timestamp"`
	Note      string          `json:"note,omitempty"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`

	// LoggedByName is the name of the user who created the log (filled dynamically).
	LoggedByName string `json:"logged_by_name,omitempty"`
}

// LogType constants enumerate the supported activity types.
const (
	LogTypeFeeding     = "feeding"
	LogTypeDiaper      = "diaper"
	LogTypeSleep       = "sleep"
	LogTypeMeasurement = "measurement"
	LogTypeMedicine    = "medicine"
	LogTypeOther       = "other"
)
