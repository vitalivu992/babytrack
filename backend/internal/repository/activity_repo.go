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

// ActivityRepo handles persistence for activity logs.
type ActivityRepo struct {
	db *pgxpool.Pool
}

// NewActivityRepo constructs an ActivityRepo.
func NewActivityRepo(db *pgxpool.Pool) *ActivityRepo { return &ActivityRepo{db: db} }

// CreateLog inserts a new activity log row.
func (r *ActivityRepo) CreateLog(ctx context.Context, l *models.ActivityLog) error {
	if l.Timestamp.IsZero() {
		l.Timestamp = time.Now()
	}
	const q = `
		INSERT INTO activity_logs (child_id, user_id, type, data, timestamp, note)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`
	return r.db.QueryRow(ctx, q,
		l.ChildID, l.UserID, l.Type, []byte(l.Data), l.Timestamp, l.Note).
		Scan(&l.ID, &l.CreatedAt)
}

// scanLog maps one row into an ActivityLog (with logger name).
func scanLog(row pgx.Row) (*models.ActivityLog, error) {
	var l models.ActivityLog
	var data []byte
	err := row.Scan(
		&l.ID, &l.ChildID, &l.UserID, &l.Type, &data,
		&l.Timestamp, &l.Note, &l.CreatedAt, &l.LoggedByName)
	if err != nil {
		return nil, err
	}
	if len(data) > 0 {
		l.Data = data
	}
	return &l, nil
}

// GetLogsByChild returns logs for a child, optionally filtered by type and a
// [from,to] time window. Results are newest first, capped at limit.
func (r *ActivityRepo) GetLogsByChild(ctx context.Context, childID interface{}, logType string, from, to *time.Time, limit int) ([]*models.ActivityLog, error) {
	q := `
		SELECT l.id, l.child_id, l.user_id, l.type, l.data, l.timestamp, l.note,
		       l.created_at, COALESCE(u.name, u.email) AS logged_by_name
		FROM activity_logs l
		LEFT JOIN users u ON u.id = l.user_id
		WHERE l.child_id = $1`
	args := []interface{}{childID}
	i := 2
	if logType != "" {
		q += fmt.Sprintf(" AND l.type = $%d", i)
		args = append(args, logType)
		i++
	}
	if from != nil {
		q += fmt.Sprintf(" AND l.timestamp >= $%d", i)
		args = append(args, *from)
		i++
	}
	if to != nil {
		q += fmt.Sprintf(" AND l.timestamp <= $%d", i)
		args = append(args, *to)
		i++
	}
	q += " ORDER BY l.timestamp DESC"
	if limit > 0 {
		q += fmt.Sprintf(" LIMIT $%d", i)
		args = append(args, limit)
	}

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query logs: %w", err)
	}
	defer rows.Close()

	var out []*models.ActivityLog
	for rows.Next() {
		l, err := scanLog(rows)
		if err != nil {
			return nil, fmt.Errorf("scan log: %w", err)
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

// DeleteLog removes a single activity log owned by the given user (or any if
// userID is nil).
func (r *ActivityRepo) DeleteLog(ctx context.Context, id, userID interface{}) error {
	var q string
	var args []interface{}
	if userID == nil {
		q = `DELETE FROM activity_logs WHERE id = $1`
		args = []interface{}{id}
	} else {
		q = `DELETE FROM activity_logs WHERE id = $1 AND user_id = $2`
		args = []interface{}{id, userID}
	}
	ct, err := r.db.Exec(ctx, q, args...)
	if err != nil {
		return fmt.Errorf("delete log: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetLogByID returns a single activity log by its ID (scoped to childID).
func (r *ActivityRepo) GetLogByID(ctx context.Context, id, childID interface{}) (*models.ActivityLog, error) {
	const q = `
		SELECT l.id, l.child_id, l.user_id, l.type, l.data, l.timestamp, l.note,
		       l.created_at, COALESCE(u.name, u.email) AS logged_by_name
		FROM activity_logs l
		LEFT JOIN users u ON u.id = l.user_id
		WHERE l.id = $1 AND l.child_id = $2`
	log, err := scanLog(r.db.QueryRow(ctx, q, id, childID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get log: %w", err)
	}
	return log, nil
}

// UpdateLog modifies an existing activity log's data, timestamp, and note.
func (r *ActivityRepo) UpdateLog(ctx context.Context, l *models.ActivityLog) error {
	const q = `
		UPDATE activity_logs
		SET data = $1, timestamp = $2, note = $3
		WHERE id = $4 AND child_id = $5`
	ct, err := r.db.Exec(ctx, q, []byte(l.Data), l.Timestamp, l.Note, l.ID, l.ChildID)
	if err != nil {
		return fmt.Errorf("update log: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// DeleteLogByChild enforces child scoping while deleting a log.
func (r *ActivityRepo) DeleteLogByChild(ctx context.Context, id, childID interface{}) error {
	ct, err := r.db.Exec(ctx,
		`DELETE FROM activity_logs WHERE id = $1 AND child_id = $2`, id, childID)
	if err != nil {
		return fmt.Errorf("delete log: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
