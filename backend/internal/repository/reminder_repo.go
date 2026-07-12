package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vitalivu992/babytrack/internal/models"
)

// ReminderRepo handles persistence for reminders.
type ReminderRepo struct {
	db *pgxpool.Pool
}

// NewReminderRepo constructs a ReminderRepo.
func NewReminderRepo(db *pgxpool.Pool) *ReminderRepo { return &ReminderRepo{db: db} }

// Create inserts a new reminder row.
func (r *ReminderRepo) Create(ctx context.Context, rm *models.Reminder) error {
	const q = `
		INSERT INTO reminders (child_id, user_id, title, cron, enabled)
		VALUES ($1, $2, $3, $4, COALESCE($5, true))
		RETURNING id, created_at, enabled`
	return r.db.QueryRow(ctx, q,
		rm.ChildID, rm.UserID, rm.Title, rm.Cron, rm.Enabled).
		Scan(&rm.ID, &rm.CreatedAt, &rm.Enabled)
}

// GetByChild returns all reminders for a child.
func (r *ReminderRepo) GetByChild(ctx context.Context, childID interface{}) ([]*models.Reminder, error) {
	const q = `
		SELECT id, child_id, user_id, title, cron, enabled, created_at
		FROM reminders WHERE child_id = $1 ORDER BY created_at ASC`
	rows, err := r.db.Query(ctx, q, childID)
	if err != nil {
		return nil, fmt.Errorf("query reminders: %w", err)
	}
	defer rows.Close()

	var out []*models.Reminder
	for rows.Next() {
		var rm models.Reminder
		if err := rows.Scan(&rm.ID, &rm.ChildID, &rm.UserID, &rm.Title, &rm.Cron, &rm.Enabled, &rm.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan reminder: %w", err)
		}
		out = append(out, &rm)
	}
	return out, rows.Err()
}

// GetByID returns a single reminder.
func (r *ReminderRepo) GetByID(ctx context.Context, id interface{}) (*models.Reminder, error) {
	const q = `
		SELECT id, child_id, user_id, title, cron, enabled, created_at
		FROM reminders WHERE id = $1`
	var rm models.Reminder
	err := r.db.QueryRow(ctx, q, id).Scan(
		&rm.ID, &rm.ChildID, &rm.UserID, &rm.Title, &rm.Cron, &rm.Enabled, &rm.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get reminder: %w", err)
	}
	return &rm, nil
}

// Update modifies a reminder's mutable fields.
func (r *ReminderRepo) Update(ctx context.Context, rm *models.Reminder) error {
	const q = `
		UPDATE reminders SET title = $1, cron = $2, enabled = $3 WHERE id = $4`
	ct, err := r.db.Exec(ctx, q, rm.Title, rm.Cron, rm.Enabled, rm.ID)
	if err != nil {
		return fmt.Errorf("update reminder: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Delete removes a reminder row.
func (r *ReminderRepo) Delete(ctx context.Context, id interface{}) error {
	ct, err := r.db.Exec(ctx, `DELETE FROM reminders WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete reminder: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
