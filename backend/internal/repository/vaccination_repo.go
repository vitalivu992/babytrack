package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vitalivu992/babytrack/internal/models"
)

// VaccinationRepo handles persistence for vaccinations.
type VaccinationRepo struct {
	db *pgxpool.Pool
}

// NewVaccinationRepo constructs a VaccinationRepo.
func NewVaccinationRepo(db *pgxpool.Pool) *VaccinationRepo { return &VaccinationRepo{db: db} }

// Create inserts a new vaccination row.
func (r *VaccinationRepo) Create(ctx context.Context, v *models.Vaccination) error {
	const q = `
		INSERT INTO vaccinations (child_id, vaccine_name, scheduled_date, administered_date, lot_number, note)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`
	return r.db.QueryRow(ctx, q,
		v.ChildID, v.VaccineName, v.ScheduledDate, v.AdministeredDate, v.LotNumber, v.Note).
		Scan(&v.ID, &v.CreatedAt)
}

// GetByChild returns all vaccinations for a child ordered by scheduled date.
func (r *VaccinationRepo) GetByChild(ctx context.Context, childID interface{}) ([]*models.Vaccination, error) {
	const q = `
		SELECT id, child_id, vaccine_name, scheduled_date, administered_date, lot_number, note, created_at
		FROM vaccinations WHERE child_id = $1
		ORDER BY scheduled_date ASC`
	rows, err := r.db.Query(ctx, q, childID)
	if err != nil {
		return nil, fmt.Errorf("query vaccinations: %w", err)
	}
	defer rows.Close()

	var out []*models.Vaccination
	for rows.Next() {
		var v models.Vaccination
		if err := rows.Scan(&v.ID, &v.ChildID, &v.VaccineName, &v.ScheduledDate, &v.AdministeredDate, &v.LotNumber, &v.Note, &v.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan vaccination: %w", err)
		}
		out = append(out, &v)
	}
	return out, rows.Err()
}

// GetByID returns a single vaccination.
func (r *VaccinationRepo) GetByID(ctx context.Context, id interface{}) (*models.Vaccination, error) {
	const q = `
		SELECT id, child_id, vaccine_name, scheduled_date, administered_date, lot_number, note, created_at
		FROM vaccinations WHERE id = $1`
	var v models.Vaccination
	err := r.db.QueryRow(ctx, q, id).Scan(
		&v.ID, &v.ChildID, &v.VaccineName, &v.ScheduledDate, &v.AdministeredDate, &v.LotNumber, &v.Note, &v.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get vaccination: %w", err)
	}
	return &v, nil
}

// MarkAdministered records an administered date and lot number.
func (r *VaccinationRepo) MarkAdministered(ctx context.Context, id interface{}, administered time.Time, lot string) error {
	ct, err := r.db.Exec(ctx,
		`UPDATE vaccinations SET administered_date = $1, lot_number = $2 WHERE id = $3`,
		administered, lot, id)
	if err != nil {
		return fmt.Errorf("mark administered: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Delete removes a vaccination row.
func (r *VaccinationRepo) Delete(ctx context.Context, id interface{}) error {
	ct, err := r.db.Exec(ctx, `DELETE FROM vaccinations WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete vaccination: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetUpcoming returns vaccinations due on or after `from` that have not yet
// been administered, ordered by due date.
func (r *VaccinationRepo) GetUpcoming(ctx context.Context, childID interface{}, from time.Time, limit int) ([]*models.Vaccination, error) {
	q := `
		SELECT id, child_id, vaccine_name, scheduled_date, administered_date, lot_number, note, created_at
		FROM vaccinations
		WHERE child_id = $1 AND administered_date IS NULL AND scheduled_date >= $2
		ORDER BY scheduled_date ASC`
	args := []interface{}{childID, from}
	if limit > 0 {
		q += " LIMIT $3"
		args = append(args, limit)
	}
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query upcoming: %w", err)
	}
	defer rows.Close()

	var out []*models.Vaccination
	for rows.Next() {
		var v models.Vaccination
		if err := rows.Scan(&v.ID, &v.ChildID, &v.VaccineName, &v.ScheduledDate, &v.AdministeredDate, &v.LotNumber, &v.Note, &v.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan vaccination: %w", err)
		}
		out = append(out, &v)
	}
	return out, rows.Err()
}

// DeleteByChild removes all vaccinations for a child (used on schedule regen).
func (r *VaccinationRepo) DeleteByChild(ctx context.Context, childID interface{}) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM vaccinations WHERE child_id = $1 AND administered_date IS NULL`, childID)
	if err != nil {
		return fmt.Errorf("delete by child: %w", err)
	}
	return nil
}
