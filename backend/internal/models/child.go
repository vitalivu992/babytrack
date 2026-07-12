package models

import (
	"time"

	"github.com/google/uuid"
)

// Child is a baby/child profile, owned by a user and optionally shared.
type Child struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	BirthDate *time.Time `json:"birth_date,omitempty" db:"birth_date"`
	Gender    string     `json:"gender"`
	PhotoURL  string     `json:"photo_url,omitempty" db:"photo_url"`
	BloodType string     `json:"blood_type,omitempty" db:"blood_type"`
	Allergies string     `json:"allergies,omitempty" db:"allergies"`
	Notes     string     `json:"notes,omitempty" db:"notes"`
	OwnerID   uuid.UUID  `json:"owner_id" db:"owner_id"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`

	// Role is the requesting user's role on this child (filled dynamically).
	Role string `json:"role,omitempty"`
}
