package models

import (
	"time"

	"github.com/google/uuid"
)

// Vaccination is a planned or administered vaccine dose for a child.
type Vaccination struct {
	ID              uuid.UUID  `json:"id"`
	ChildID         uuid.UUID  `json:"child_id" db:"child_id"`
	VaccineName     string     `json:"vaccine_name" db:"vaccine_name"`
	ScheduledDate   time.Time  `json:"scheduled_date" db:"scheduled_date"`
	AdministeredDate *time.Time `json:"administered_date,omitempty" db:"administered_date"`
	LotNumber       string     `json:"lot_number,omitempty" db:"lot_number"`
	Note            string     `json:"note,omitempty"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
}
