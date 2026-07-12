package models

import (
	"time"

	"github.com/google/uuid"
)

// Measurement stores a single numeric growth value (weight, height, ...).
type Measurement struct {
	ID          uuid.UUID `json:"id"`
	ChildID     uuid.UUID `json:"child_id" db:"child_id"`
	Type        string    `json:"type"`
	Value       float64   `json:"value"`
	Unit        string    `json:"unit"`
	MeasuredAt  time.Time `json:"measured_at" db:"measured_at"`
	Note        string    `json:"note,omitempty"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// Measurement type constants.
const (
	MeasurementWeight = "weight"
	MeasurementHeight = "height"
	MeasurementHead   = "head_circumference"
)
