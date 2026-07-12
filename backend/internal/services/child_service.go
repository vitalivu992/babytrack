package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/vitalivu992/babytrack/internal/models"
	"github.com/vitalivu992/babytrack/internal/repository"
)

// ChildService owns child CRUD and the owner-bootstrap logic.
type ChildService struct {
	children *repository.ChildRepo
	sharing  *repository.ChildUserRepo
}

// NewChildService constructs a ChildService.
func NewChildService(children *repository.ChildRepo, sharing *repository.ChildUserRepo) *ChildService {
	return &ChildService{children: children, sharing: sharing}
}

// CreateInput holds fields for creating a child.
type CreateInput struct {
	Name      string     `json:"name"`
	BirthDate *time.Time `json:"birth_date"`
	Gender    string     `json:"gender"`
	PhotoURL  string     `json:"photo_url"`
	BloodType string     `json:"blood_type"`
	Allergies string     `json:"allergies"`
	Notes     string     `json:"notes"`
}

// Create makes a new child owned by ownerID and grants the owner role.
func (s *ChildService) Create(ctx Ctx, ownerID uuid.UUID, in CreateInput) (*models.Child, error) {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		return nil, fmtw("%w: name is required", ErrValidation)
	}
	c := &models.Child{
		Name:      in.Name,
		BirthDate: in.BirthDate,
		Gender:    in.Gender,
		PhotoURL:  in.PhotoURL,
		BloodType: in.BloodType,
		Allergies: in.Allergies,
		Notes:     in.Notes,
		OwnerID:   ownerID,
	}
	if err := s.children.CreateChild(ctx, c); err != nil {
		return nil, fmt.Errorf("create child: %w", err)
	}
	if err := s.sharing.Grant(ctx, c.ID, ownerID, models.RoleOwner); err != nil {
		return nil, fmt.Errorf("grant owner: %w", err)
	}
	c.Role = models.RoleOwner
	return c, nil
}

// List returns all children a user can access.
func (s *ChildService) List(ctx Ctx, userID uuid.UUID) ([]*models.Child, error) {
	return s.children.GetChildrenByUserID(ctx, userID)
}

// Get returns a single child.
func (s *ChildService) Get(ctx Ctx, id uuid.UUID) (*models.Child, error) {
	c, err := s.children.GetChildByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return c, nil
}

// UpdateInput holds editable child fields. Pointers distinguish "unset" from
// "clear to empty".
type UpdateInput struct {
	Name      *string    `json:"name"`
	BirthDate *time.Time `json:"birth_date"`
	Gender    *string    `json:"gender"`
	PhotoURL  *string    `json:"photo_url"`
	BloodType *string    `json:"blood_type"`
	Allergies *string    `json:"allergies"`
	Notes     *string    `json:"notes"`
}

// Update applies partial changes to a child.
func (s *ChildService) Update(ctx Ctx, id uuid.UUID, in UpdateInput) (*models.Child, error) {
	c, err := s.children.GetChildByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if in.Name != nil {
		c.Name = strings.TrimSpace(*in.Name)
		if c.Name == "" {
			return nil, fmtw("%w: name cannot be empty", ErrValidation)
		}
	}
	if in.BirthDate != nil {
		c.BirthDate = in.BirthDate
	}
	if in.Gender != nil {
		c.Gender = *in.Gender
	}
	if in.PhotoURL != nil {
		c.PhotoURL = *in.PhotoURL
	}
	if in.BloodType != nil {
		c.BloodType = *in.BloodType
	}
	if in.Allergies != nil {
		c.Allergies = *in.Allergies
	}
	if in.Notes != nil {
		c.Notes = *in.Notes
	}
	if err := s.children.UpdateChild(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// Delete removes a child. Only the owner may delete it (caller enforces).
func (s *ChildService) Delete(ctx Ctx, id uuid.UUID) error {
	err := s.children.DeleteChild(ctx, id)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return err
	}
	return err
}
