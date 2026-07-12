package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vitalivu992/babytrack/internal/models"
)

// ChildRepo handles persistence for children.
type ChildRepo struct {
	db *pgxpool.Pool
}

// NewChildRepo constructs a ChildRepo.
func NewChildRepo(db *pgxpool.Pool) *ChildRepo { return &ChildRepo{db: db} }

// CreateChild inserts a new child row.
func (r *ChildRepo) CreateChild(ctx context.Context, c *models.Child) error {
	const q = `
		INSERT INTO children (name, birth_date, gender, photo_url, blood_type, allergies, notes, owner_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at`
	return r.db.QueryRow(ctx, q,
		c.Name, c.BirthDate, c.Gender, c.PhotoURL, c.BloodType, c.Allergies, c.Notes, c.OwnerID).
		Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

// GetChildByID returns a single child by id.
func (r *ChildRepo) GetChildByID(ctx context.Context, id interface{}) (*models.Child, error) {
	const q = `
		SELECT id, name, birth_date, gender, photo_url, blood_type, allergies, notes,
		       owner_id, created_at, updated_at
		FROM children WHERE id = $1`
	var c models.Child
	err := r.db.QueryRow(ctx, q, id).Scan(
		&c.ID, &c.Name, &c.BirthDate, &c.Gender, &c.PhotoURL, &c.BloodType,
		&c.Allergies, &c.Notes, &c.OwnerID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get child by id: %w", err)
	}
	return &c, nil
}

// GetChildrenByUserID returns all children a user can access (owned or shared),
// annotated with the user's role on each.
func (r *ChildRepo) GetChildrenByUserID(ctx context.Context, userID interface{}) ([]*models.Child, error) {
	const q = `
		SELECT c.id, c.name, c.birth_date, c.gender, c.photo_url, c.blood_type,
		       c.allergies, c.notes, c.owner_id, c.created_at, c.updated_at, cu.role
		FROM children c
		JOIN child_users cu ON cu.child_id = c.id
		WHERE cu.user_id = $1
		ORDER BY c.created_at ASC`
	rows, err := r.db.Query(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("query children: %w", err)
	}
	defer rows.Close()

	var out []*models.Child
	for rows.Next() {
		var c models.Child
		if err := rows.Scan(
			&c.ID, &c.Name, &c.BirthDate, &c.Gender, &c.PhotoURL, &c.BloodType,
			&c.Allergies, &c.Notes, &c.OwnerID, &c.CreatedAt, &c.UpdatedAt, &c.Role); err != nil {
			return nil, fmt.Errorf("scan child: %w", err)
		}
		out = append(out, &c)
	}
	return out, rows.Err()
}

// UpdateChild updates the mutable fields of a child.
func (r *ChildRepo) UpdateChild(ctx context.Context, c *models.Child) error {
	const q = `
		UPDATE children
		SET name = $1, birth_date = $2, gender = $3, photo_url = $4,
		    blood_type = $5, allergies = $6, notes = $7, updated_at = now()
		WHERE id = $8 RETURNING updated_at`
	err := r.db.QueryRow(ctx, q,
		c.Name, c.BirthDate, c.Gender, c.PhotoURL, c.BloodType, c.Allergies, c.Notes, c.ID).
		Scan(&c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("update child: %w", err)
	}
	return nil
}

// DeleteChild removes a child row.
func (r *ChildRepo) DeleteChild(ctx context.Context, id interface{}) error {
	ct, err := r.db.Exec(ctx, `DELETE FROM children WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete child: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
