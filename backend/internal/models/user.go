package models

import (
	"time"

	"github.com/google/uuid"
)

// User is an authenticated account in BabyTrack.
type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}
