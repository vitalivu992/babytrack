package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vitalivu992/babytrack/internal/models"
)

// MeasurementRepo handles persistence for measurements.
type MeasurementRepo struct {
	db *pgxpool.Pool
}

// NewMeasurementRepo constructs a MeasurementRepo.
func NewMeasurementRepo(db *pgxpool.Pool) *MeasurementRepo { return &MeasurementRepo{db: db} }

// Create inserts a new measurement row.
func (r *MeasurementRepo) Create(ctx context.Context, m *models.Measurement) error {
	const q = `
		INSERT INTO measurements (child_id, type, value, unit, measured_at, note)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`
	return r.db.QueryRow(ctx, q,
		m.ChildID, m.Type, m.Value, m.Unit, m.MeasuredAt, m.Note).
		Scan(&m.ID, &m.CreatedAt)
}

// GetByChild returns measurements for a child, optionally filtered by type.
func (r *MeasurementRepo) GetByChild(ctx context.Context, childID interface{}, mType string) ([]*models.Measurement, error) {
	q := `
		SELECT id, child_id, type, value, unit, measured_at, note, created_at
		FROM measurements WHERE child_id = $1`
	args := []interface{}{childID}
	if mType != "" {
		q += " AND type = $2 ORDER BY measured_at ASC"
		args = append(args, mType)
	} else {
		q += " ORDER BY measured_at DESC"
	}
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query measurements: %w", err)
	}
	defer rows.Close()

	var out []*models.Measurement
	for rows.Next() {
		var m models.Measurement
		if err := rows.Scan(&m.ID, &m.ChildID, &m.Type, &m.Value, &m.Unit, &m.MeasuredAt, &m.Note, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan measurement: %w", err)
		}
		out = append(out, &m)
	}
	return out, rows.Err()
}

// GetByID returns a single measurement.
func (r *MeasurementRepo) GetByID(ctx context.Context, id interface{}) (*models.Measurement, error) {
	const q = `
		SELECT id, child_id, type, value, unit, measured_at, note, created_at
		FROM measurements WHERE id = $1`
	var m models.Measurement
	err := r.db.QueryRow(ctx, q, id).Scan(
		&m.ID, &m.ChildID, &m.Type, &m.Value, &m.Unit, &m.MeasuredAt, &m.Note, &m.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get measurement: %w", err)
	}
	return &m, nil
}

// Update modifies a measurement row.
func (r *MeasurementRepo) Update(ctx context.Context, m *models.Measurement) error {
	const q = `
		UPDATE measurements
		SET type = $1, value = $2, unit = $3, measured_at = $4, note = $5
		WHERE id = $6`
	ct, err := r.db.Exec(ctx, q, m.Type, m.Value, m.Unit, m.MeasuredAt, m.Note, m.ID)
	if err != nil {
		return fmt.Errorf("update measurement: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Delete removes a measurement row.
func (r *MeasurementRepo) Delete(ctx context.Context, id interface{}) error {
	ct, err := r.db.Exec(ctx, `DELETE FROM measurements WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete measurement: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
