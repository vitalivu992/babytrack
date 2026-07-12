package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/vitalivu992/babytrack/internal/models"
	"github.com/vitalivu992/babytrack/internal/repository"
)

// VaccinationService manages vaccination records and WHO-schedule generation.
type VaccinationService struct {
	vaccines *repository.VaccinationRepo
	children *repository.ChildRepo
}

// NewVaccinationService constructs a VaccinationService.
func NewVaccinationService(vaccines *repository.VaccinationRepo, children *repository.ChildRepo) *VaccinationService {
	return &VaccinationService{vaccines: vaccines, children: children}
}

// WHOVaccine describes one entry in the immunization schedule, given as an
// offset (in days) from birth.
type WHOVaccine struct {
	Name   string
	AgeDays int
}

// WHOSchedule is a simplified WHO/standard immunization timeline (doses are
// keyed by vaccine name + age). Sourced from WHO expanded programme guidance.
var WHOSchedule = []WHOVaccine{
	{"BCG (Birth)", 0},
	{"Hepatitis B — Birth dose", 0},
	{"OPV-0", 0},
	{"DTaP-1 / Pentavalent-1", 42},   // 6 weeks
	{"IPV-1", 42},
	{"OPV-1", 42},
	{"Rotavirus-1", 42},
	{"PCV-1 (Pneumococcal)", 42},
	{"DTaP-2 / Pentavalent-2", 70},   // 10 weeks
	{"OPV-2", 70},
	{"Rotavirus-2", 70},
	{"PCV-2", 70},
	{"DTaP-3 / Pentavalent-3", 98},   // 14 weeks
	{"OPV-3", 98},
	{"IPV-2", 98},
	{"PCV-3", 98},
	{"Measles-1 (MMR-1)", 274},       // ~9 months
	{"Yellow Fever", 274},
	{"Measles-2 (MMR-2)", 548},       // ~18 months
	{"DTaP Booster", 548},
}

// ListByChild returns all vaccinations for a child.
func (s *VaccinationService) ListByChild(ctx Ctx, childID uuid.UUID) ([]*models.Vaccination, error) {
	return s.vaccines.GetByChild(ctx, childID)
}

// Upcoming returns unadministered vaccinations due on/after `from`.
func (s *VaccinationService) Upcoming(ctx Ctx, childID uuid.UUID, limit int) ([]*models.Vaccination, error) {
	return s.vaccines.GetUpcoming(ctx, childID, time.Now(), limit)
}

// MarkAdministered records that a vaccine was given.
func (s *VaccinationService) MarkAdministered(ctx Ctx, id uuid.UUID, administered time.Time, lot string) (*models.Vaccination, error) {
	if administered.IsZero() {
		administered = time.Now()
	}
	if err := s.vaccines.MarkAdministered(ctx, id, administered, lot); err != nil {
		return nil, err
	}
	return s.vaccines.GetByID(ctx, id)
}

// Delete removes a vaccination row.
func (s *VaccinationService) Delete(ctx Ctx, id uuid.UUID) error {
	return s.vaccines.Delete(ctx, id)
}

// GenerateSchedule removes any existing unadministered rows for a child and
// regenerates them from the WHO schedule based on the child's DOB. Administered
// doses are preserved. If the child has no DOB, an error is returned.
func (s *VaccinationService) GenerateSchedule(ctx context.Context, childID uuid.UUID) ([]*models.Vaccination, error) {
	c, err := s.children.GetChildByID(ctx, childID)
	if err != nil {
		return nil, err
	}
	if c.BirthDate == nil {
		return nil, fmt.Errorf("%w: child has no birth date", ErrValidation)
	}
	if err := s.vaccines.DeleteByChild(ctx, childID); err != nil {
		return nil, fmt.Errorf("clear schedule: %w", err)
	}
	birth := *c.BirthDate
	for _, v := range WHOSchedule {
		due := birth.AddDate(0, 0, v.AgeDays)
		rec := &models.Vaccination{
			ChildID:       childID,
			VaccineName:   v.Name,
			ScheduledDate: due,
		}
		if err := s.vaccines.Create(ctx, rec); err != nil {
			return nil, fmt.Errorf("seed vaccine %q: %w", v.Name, err)
		}
	}
	return s.vaccines.GetByChild(ctx, childID)
}

// EnsureSchedule generates a schedule if the child currently has none.
func (s *VaccinationService) EnsureSchedule(ctx context.Context, childID uuid.UUID) ([]*models.Vaccination, error) {
	existing, err := s.vaccines.GetByChild(ctx, childID)
	if err != nil {
		return nil, err
	}
	if len(existing) > 0 {
		return existing, nil
	}
	return s.GenerateSchedule(ctx, childID)
}
